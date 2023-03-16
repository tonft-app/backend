package wallet

import (
	"bytes"
	"crypto/ed25519"
	"fmt"

	"github.com/xssnick/tonutils-go/address"
	"github.com/xssnick/tonutils-go/tlb"
	"github.com/xssnick/tonutils-go/tvm/cell"
)

const DefaultSubwallet = 698983191

func AddressFromPubKey(key ed25519.PublicKey, ver Version, subwallet uint32) (*address.Address, error) {
	state, err := GetStateInit(key, ver, subwallet)
	if err != nil {
		return nil, fmt.Errorf("failed to get state: %w", err)
	}

	stateCell, err := tlb.ToCell(state)
	if err != nil {
		return nil, fmt.Errorf("failed to get state cell: %w", err)
	}

	addr := address.NewAddress(0, 0, stateCell.Hash())

	return addr, nil
}

func GetWalletVersion(account *tlb.Account) Version {
	if !account.IsActive || account.State.Status != tlb.AccountStatusActive {
		return Unknown
	}

	for v := range walletCodeHex {
		code, ok := walletCode[v]
		if !ok {
			continue
		}
		if bytes.Equal(account.Code.Hash(), code.Hash()) {
			return v
		}
	}

	return Unknown
}

func GetStateInit(pubKey ed25519.PublicKey, ver Version, subWallet uint32) (*tlb.StateInit, error) {
	code, ok := walletCode[ver]
	if !ok {
		return nil, fmt.Errorf("cannot get code: %w", ErrUnsupportedWalletVersion)
	}

	var data *cell.Cell
	switch ver {
	case V3:
		data = cell.BeginCell().
			MustStoreUInt(0, 32).                 // seqno
			MustStoreUInt(uint64(subWallet), 32). // sub wallet
			MustStoreSlice(pubKey, 256).
			EndCell()
	case V4R2:
		data = cell.BeginCell().
			MustStoreUInt(0, 32). // seqno
			MustStoreUInt(uint64(subWallet), 32).
			MustStoreSlice(pubKey, 256).
			MustStoreDict(nil). // empty dict of plugins
			EndCell()
	case HighloadV2R2:
		data = cell.BeginCell().
			MustStoreUInt(uint64(subWallet), 32).
			MustStoreUInt(0, 64). // last cleaned
			MustStoreSlice(pubKey, 256).
			MustStoreDict(nil). // old queries
			EndCell()
	default:
		return nil, ErrUnsupportedWalletVersion
	}

	return &tlb.StateInit{
		Data: data,
		Code: code,
	}, nil
}
