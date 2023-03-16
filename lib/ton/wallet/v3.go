package wallet

import (
	"context"
	"errors"
	"fmt"
	"github.com/xssnick/tonutils-go/ton"
	"time"

	"github.com/xssnick/tonutils-go/tvm/cell"
)

// https://github.com/toncenter/tonweb/blob/master/src/contract/wallet/WalletSources.md#v3-wallet
const _V3R1CodeHex = "B5EE9C724101010100620000C0FF0020DD2082014C97BA9730ED44D0D70B1FE0A4F2608308D71820D31FD31FD31FF82313BBF263ED44D0D31FD31FD3FFD15132BAF2A15144BAF2A204F901541055F910F2A3F8009320D74A96D307D402FB00E8D101A4C8CB1FCB1FCBFFC9ED543FBE6EE0"

// https://github.com/toncenter/tonweb/blob/master/src/contract/wallet/WalletSources.md#revision-2-2
const _V3R2CodeHex = "B5EE9C724101010100710000DEFF0020DD2082014C97BA218201339CBAB19F71B0ED44D0D31FD31F31D70BFFE304E0A4F2608308D71820D31FD31FD31FF82313BBF263ED44D0D31FD31FD3FFD15132BAF2A15144BAF2A204F901541055F910F2A3F8009320D74A96D307D402FB00E8D101A4C8CB1FCB1FCBFFC9ED5410BD6DAD"

type SpecV3 struct {
	SpecRegular
}

func (s *SpecV3) BuildMessage(ctx context.Context, isInitialized bool, block *ton.BlockIDExt, messages []*Message) (*cell.Cell, error) {
	if len(messages) > 4 {
		return nil, errors.New("for this type of wallet max 4 messages can be sent in the same time")
	}

	var seq uint64

	if isInitialized {
		resp, err := s.wallet.api.RunGetMethod(ctx, block, s.wallet.addr, "seqno")
		if err != nil {
			return nil, fmt.Errorf("get seqno err: %w", err)
		}

		iSeq, err := resp.Int(0)
		if err != nil {
			return nil, fmt.Errorf("failed to parse seqno: %w", err)
		}
		seq = iSeq.Uint64()
	}

	payload := cell.BeginCell().MustStoreUInt(uint64(s.wallet.subwallet), 32).
		MustStoreUInt(uint64(timeNow().Add(time.Duration(s.messagesTTL)*time.Second).UTC().Unix()), 32).
		MustStoreUInt(seq, 32)

	for i, message := range messages {
		intMsg, err := message.InternalMessage.ToCell()
		if err != nil {
			return nil, fmt.Errorf("failed to convert internal message %d to cell: %w", i, err)
		}

		payload.MustStoreUInt(uint64(message.Mode), 8).MustStoreRef(intMsg)
	}

	sign := payload.EndCell().Sign(s.wallet.key)
	msg := cell.BeginCell().MustStoreSlice(sign, 512).MustStoreBuilder(payload).EndCell()

	return msg, nil
}
