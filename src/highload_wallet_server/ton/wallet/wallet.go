package wallet

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/xssnick/tonutils-go/ton"

	"github.com/xssnick/tonutils-go/address"
	"github.com/xssnick/tonutils-go/tlb"
	"github.com/xssnick/tonutils-go/tvm/cell"
)

type Version int

const (
	V1R1         Version = 11
	V1R2         Version = 12
	V1R3         Version = 13
	V2R1         Version = 21
	V2R2         Version = 22
	V3R1         Version = 31
	V3R2         Version = 32
	V3                   = V3R2
	V4R1         Version = 41
	V4R2         Version = 42
	HighloadV2R2 Version = 122
	Lockup       Version = 200
	Unknown      Version = 0
)

func (v Version) String() string {
	if v == Unknown {
		return "unknown"
	}
	if v/10 > 0 && v/10 < 10 {
		return fmt.Sprintf("V%dR%d", v/10, v%10)
	}
	if v/100 == 1 {
		return fmt.Sprintf("highload V%dR%d", v/100/10, v%10)
	}
	if v/100 == 2 {
		return fmt.Sprintf("lockup")
	}
	return fmt.Sprintf("%d", v)
}

var (
	walletCodeHex = map[Version]string{
		V1R1: _V1R1CodeHex, V1R2: _V1R2CodeHex, V1R3: _V1R3CodeHex,
		V2R1: _V2R1CodeHex, V2R2: _V2R2CodeHex,
		V3R1: _V3R1CodeHex, V3R2: _V3R2CodeHex,
		V4R1: _V4R1CodeHex, V4R2: _V4R2CodeHex,
		HighloadV2R2: _HighloadV2R2CodeHex,
		Lockup:       _LockupCodeHex,
	}
	walletCodeBOC = map[Version][]byte{}
	walletCode    = map[Version]*cell.Cell{}
)

func init() {
	var err error

	for ver, codeHex := range walletCodeHex {
		walletCodeBOC[ver], err = hex.DecodeString(codeHex)
		if err != nil {
			panic(err)
		}
		walletCode[ver], err = cell.FromBOC(walletCodeBOC[ver])
		if err != nil {
			panic(err)
		}
	}
}

// defining some funcs this way to mock for tests
var randUint32 = rand.Uint32
var timeNow = time.Now

var (
	ErrUnsupportedWalletVersion = errors.New("wallet version is not supported")
	ErrTxWasNotConfirmed        = errors.New("transaction was not confirmed in a given deadline, but it may still be confirmed later")
	ErrTxWasNotFound            = errors.New("requested transaction is not found")
)

type TonAPI interface {
	Client() ton.LiteClient
	CurrentMasterchainInfo(ctx context.Context) (*ton.BlockIDExt, error)
	GetAccount(ctx context.Context, block *ton.BlockIDExt, addr *address.Address) (*tlb.Account, error)
	SendExternalMessage(ctx context.Context, msg *tlb.ExternalMessage) error
	RunGetMethod(ctx context.Context, blockInfo *ton.BlockIDExt, addr *address.Address, method string, params ...interface{}) (*ton.ExecutionResult, error)
	ListTransactions(ctx context.Context, addr *address.Address, num uint32, lt uint64, txHash []byte) ([]*tlb.Transaction, error)
	WaitNextMasterBlock(ctx context.Context, master *ton.BlockIDExt) (*ton.BlockIDExt, error)
}

type Message struct {
	Mode            uint8
	InternalMessage *tlb.InternalMessage
}

type Wallet struct {
	api  TonAPI
	key  ed25519.PrivateKey
	addr *address.Address
	ver  Version

	// Can be used to operate multiple wallets with the same key and version.
	// use GetSubwallet if you need it.
	subwallet uint32

	// Stores a pointer to implementation of the version related functionality
	spec any
}

func FromPrivateKey(api TonAPI, key ed25519.PrivateKey, version Version) (*Wallet, error) {
	addr, err := AddressFromPubKey(key.Public().(ed25519.PublicKey), version, DefaultSubwallet)
	if err != nil {
		return nil, err
	}

	w := &Wallet{
		api:       api,
		key:       key,
		addr:      addr,
		ver:       version,
		subwallet: DefaultSubwallet,
	}

	w.spec, err = getSpec(w)
	if err != nil {
		return nil, err
	}

	return w, nil
}

func getSpec(w *Wallet) (any, error) {
	regular := SpecRegular{
		wallet:      w,
		messagesTTL: 60 * 3, // default ttl 3 min
	}

	switch w.ver {
	case V3:
		return &SpecV3{regular}, nil
	case V4R2:
		return &SpecV4R2{regular}, nil
	case HighloadV2R2:
		return &SpecHighloadV2R2{regular}, nil
	}

	return nil, fmt.Errorf("cannot init spec: %w", ErrUnsupportedWalletVersion)
}

func (w *Wallet) Address() *address.Address {
	return w.addr
}

func (w *Wallet) PrivateKey() ed25519.PrivateKey {
	return w.key
}

func (w *Wallet) GetSubwallet(subwallet uint32) (*Wallet, error) {
	addr, err := AddressFromPubKey(w.key.Public().(ed25519.PublicKey), w.ver, subwallet)
	if err != nil {
		return nil, err
	}

	sub := &Wallet{
		api:       w.api,
		key:       w.key,
		addr:      addr,
		ver:       w.ver,
		subwallet: subwallet,
	}

	sub.spec, err = getSpec(sub)
	if err != nil {
		return nil, err
	}

	return sub, nil
}

func (w *Wallet) GetBalance(ctx context.Context, block *ton.BlockIDExt) (tlb.Coins, error) {
	acc, err := w.api.GetAccount(ctx, block, w.addr)
	if err != nil {
		return tlb.Coins{}, fmt.Errorf("failed to get account state: %w", err)
	}

	if !acc.IsActive {
		return tlb.Coins{}, nil
	}

	return acc.State.Balance, nil
}

func (w *Wallet) GetSpec() any {
	return w.spec
}

func (w *Wallet) BuildMessageForMany(ctx context.Context, messages []*Message) (*tlb.ExternalMessage, error) {
	var stateInit *tlb.StateInit

	block, err := w.api.CurrentMasterchainInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get block: %w", err)
	}

	acc, err := w.api.GetAccount(ctx, block, w.addr)
	if err != nil {
		return nil, fmt.Errorf("failed to get account state: %w", err)
	}

	initialized := true
	if !acc.IsActive || acc.State.Status != tlb.AccountStatusActive {
		initialized = false

		stateInit, err = GetStateInit(w.key.Public().(ed25519.PublicKey), w.ver, w.subwallet)
		if err != nil {
			return nil, fmt.Errorf("failed to get state init: %w", err)
		}
	}

	var msg *cell.Cell
	switch w.ver {
	case V3, V4R2:
		msg, err = w.spec.(RegularBuilder).BuildMessage(ctx, initialized, block, messages)
		if err != nil {
			return nil, fmt.Errorf("build message err: %w", err)
		}
	case HighloadV2R2:
		msg, err = w.spec.(*SpecHighloadV2R2).BuildMessage(ctx, randUint32(), messages)
		if err != nil {
			return nil, fmt.Errorf("build message err: %w", err)
		}
	default:
		return nil, fmt.Errorf("send is not yet supported: %w", ErrUnsupportedWalletVersion)
	}

	return &tlb.ExternalMessage{
		DstAddr:   w.addr,
		StateInit: stateInit,
		Body:      msg,
	}, nil
}

func (w *Wallet) Send(ctx context.Context, message *Message, waitConfirmation ...bool) error {
	return w.SendMany(ctx, []*Message{message}, waitConfirmation...)
}

func (w *Wallet) SendMany(ctx context.Context, messages []*Message, waitConfirmation ...bool) error {
	_, _, err := w.sendMany(ctx, messages, waitConfirmation...)
	return err
}

// SendManyGetInMsgHash returns hash of external incoming message payload.
func (w *Wallet) SendManyGetInMsgHash(ctx context.Context, messages []*Message, waitConfirmation ...bool) ([]byte, error) {
	_, inMsgHash, err := w.sendMany(ctx, messages, waitConfirmation...)
	return inMsgHash, err
}

// SendManyWaitTxHash always waits for tx block confirmation and returns found tx hash in block.
func (w *Wallet) SendManyWaitTxHash(ctx context.Context, messages []*Message) ([]byte, error) {
	txHash, _, err := w.sendMany(ctx, messages, true)
	return txHash, err
}

func (w *Wallet) sendMany(ctx context.Context, messages []*Message, waitConfirmation ...bool) (txHash []byte, inMsgHash []byte, err error) {
	block, err := w.api.CurrentMasterchainInfo(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get block: %w", err)
	}

	acc, err := w.api.GetAccount(ctx, block, w.addr)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get account state: %w", err)
	}

	ext, err := w.BuildMessageForMany(ctx, messages)
	if err != nil {
		return nil, nil, err
	}
	inMsgHash = ext.Body.Hash()

	if err = w.api.SendExternalMessage(ctx, ext); err != nil {
		return nil, nil, fmt.Errorf("failed to send message: %w", err)
	}

	if len(waitConfirmation) > 0 && waitConfirmation[0] {
		txHash, err = w.waitConfirmation(ctx, block, acc, ext)
		if err != nil {
			return nil, nil, err
		}
	}

	return txHash, inMsgHash, nil
}

func (w *Wallet) waitConfirmation(ctx context.Context, block *ton.BlockIDExt, acc *tlb.Account, ext *tlb.ExternalMessage) ([]byte, error) {
	if _, hasDeadline := ctx.Deadline(); !hasDeadline {
		// fallback timeout to not stuck forever with background context
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 180*time.Second)
		defer cancel()
	}
	till, _ := ctx.Deadline()

	ctx = w.api.Client().StickyContext(ctx)

	for time.Now().Before(till) {
		blockNew, err := w.api.WaitNextMasterBlock(ctx, block)
		if err != nil {
			continue
		}

		accNew, err := w.api.GetAccount(ctx, blockNew, w.addr)
		if err != nil {
			continue
		}
		block = blockNew

		if accNew.LastTxLT == acc.LastTxLT {
			// if not in block, maybe LS lost our message, send it again
			if err = w.api.SendExternalMessage(ctx, ext); err != nil {
				continue
			}

			continue
		}

		lastLt, lastHash := accNew.LastTxLT, accNew.LastTxHash

		// it is possible that > 5 new not related transactions will happen, and we should not lose our scan offset,
		// to prevent this we will scan till we reach last seen offset.
		for time.Now().Before(till) {
			// we try to get last 5 transactions, and check if we have our new there.
			txList, err := w.api.ListTransactions(ctx, w.addr, 5, lastLt, lastHash)
			if err != nil {
				continue
			}

			sawLastTx := false
			for i, transaction := range txList {
				if i == 0 {
					// get previous of the oldest tx, in case if we need to scan deeper
					lastLt, lastHash = txList[0].PrevTxLT, txList[0].PrevTxHash
				}

				if !sawLastTx && transaction.PrevTxLT == acc.LastTxLT &&
					bytes.Equal(transaction.PrevTxHash, acc.LastTxHash) {
					sawLastTx = true
				}

				if transaction.IO.In != nil && transaction.IO.In.MsgType == tlb.MsgTypeExternalIn {
					extIn := transaction.IO.In.AsExternalIn()
					if ext.StateInit != nil {
						if extIn.StateInit == nil {
							continue
						}

						if !bytes.Equal(ext.StateInit.Data.Hash(), extIn.StateInit.Data.Hash()) {
							continue
						}

						if !bytes.Equal(ext.StateInit.Code.Hash(), extIn.StateInit.Code.Hash()) {
							continue
						}
					}

					if !bytes.Equal(extIn.Body.Hash(), ext.Body.Hash()) {
						continue
					}

					return transaction.Hash, nil
				}
			}

			if sawLastTx {
				break
			}
		}
		acc = accNew
	}

	return nil, ErrTxWasNotConfirmed
}

// TransferNoBounce - can be used to transfer TON to not yet initialized contract/wallet
func (w *Wallet) TransferNoBounce(ctx context.Context, to *address.Address, amount tlb.Coins, comment string, waitConfirmation ...bool) error {
	return w.transfer(ctx, to, amount, comment, false, waitConfirmation...)
}

// Transfer - safe transfer, in case of error on smart contract side, you will get coins back,
// cannot be used to transfer TON to not yet initialized contract/wallet
func (w *Wallet) Transfer(ctx context.Context, to *address.Address, amount tlb.Coins, comment string, waitConfirmation ...bool) error {
	return w.transfer(ctx, to, amount, comment, true, waitConfirmation...)
}

func CreateCommentCell(text string) (*cell.Cell, error) {
	// comment ident
	root := cell.BeginCell().MustStoreUInt(0, 32)

	if err := root.StoreStringSnake(text); err != nil {
		return nil, fmt.Errorf("failed to build comment: %w", err)
	}

	return root.EndCell(), nil
}

func (w *Wallet) transfer(ctx context.Context, to *address.Address, amount tlb.Coins, comment string, bounce bool, waitConfirmation ...bool) (err error) {
	var body *cell.Cell
	if comment != "" {
		body, err = CreateCommentCell(comment)
		if err != nil {
			return err
		}
	}

	return w.Send(ctx, &Message{
		Mode: 1,
		InternalMessage: &tlb.InternalMessage{
			IHRDisabled: true,
			Bounce:      bounce,
			DstAddr:     to,
			Amount:      amount,
			Body:        body,
		},
	}, waitConfirmation...)
}

func (w *Wallet) DeployContract(ctx context.Context, amount tlb.Coins, msgBody, contractCode, contractData *cell.Cell, waitConfirmation ...bool) (*address.Address, error) {
	state := &tlb.StateInit{
		Data: contractData,
		Code: contractCode,
	}

	stateCell, err := tlb.ToCell(state)
	if err != nil {
		return nil, err
	}

	addr := address.NewAddress(0, 0, stateCell.Hash())

	if err = w.Send(ctx, &Message{
		Mode: 1,
		InternalMessage: &tlb.InternalMessage{
			IHRDisabled: true,
			Bounce:      false,
			DstAddr:     addr,
			Amount:      amount,
			Body:        msgBody,
			StateInit:   state,
		},
	}, waitConfirmation...); err != nil {
		return nil, err
	}

	return addr, nil
}

// FindTransactionByInMsgHash returns transaction in wallet account with incoming message hash equal to msgHash.
func (w *Wallet) FindTransactionByInMsgHash(ctx context.Context, msgHash []byte, maxTxNumToScan ...int) (*tlb.Transaction, error) {
	limit := 60
	if len(maxTxNumToScan) > 0 {
		limit = maxTxNumToScan[0]
	}

	block, err := w.api.CurrentMasterchainInfo(ctx)
	if err != nil {
		return nil, fmt.Errorf("cannot get masterchain info: %w", err)
	}

	acc, err := w.api.GetAccount(ctx, block, w.addr)
	if err != nil {
		return nil, fmt.Errorf("cannot get account: %w", err)
	}
	if !acc.IsActive { // no tx is made from this account
		return nil, fmt.Errorf("account is inactive: %w", ErrTxWasNotFound)
	}

	scanned := 0
	for lastLt, lastHash := acc.LastTxLT, acc.LastTxHash; ; {
		if lastLt == 0 { // no older transactions
			return nil, ErrTxWasNotFound
		}

		txList, err := w.api.ListTransactions(ctx, w.addr, 15, lastLt, lastHash)
		if err != nil && strings.Contains(err.Error(), "cannot compute block with specified transaction: lt not in db") {
			return nil, fmt.Errorf("archive node is needed: %w", ErrTxWasNotFound)
		}
		if err != nil {
			return nil, fmt.Errorf("cannot list transactions: %w", err)
		}

		for i, transaction := range txList {
			if i == 0 {
				// get previous of the oldest tx, in case if we need to scan deeper
				lastLt, lastHash = txList[0].PrevTxLT, txList[0].PrevTxHash
			}

			if transaction.IO.In == nil {
				continue
			}
			if !bytes.Equal(transaction.IO.In.Msg.Payload().Hash(), msgHash) {
				continue
			}

			return transaction, nil
		}

		scanned += 15

		if scanned >= limit {
			return nil, fmt.Errorf("scan limit of %d transactions was reached, %d transactions was checked and hash was not found", limit, scanned)
		}
	}
}

func SimpleMessage(to *address.Address, amount tlb.Coins, payload *cell.Cell) *Message {
	return &Message{
		Mode: 1,
		InternalMessage: &tlb.InternalMessage{
			IHRDisabled: true,
			Bounce:      true,
			DstAddr:     to,
			Amount:      amount,
			Body:        payload,
		},
	}
}
