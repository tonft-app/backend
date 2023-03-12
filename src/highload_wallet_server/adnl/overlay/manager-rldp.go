package overlay

import (
	"context"
	"encoding/hex"
	"fmt"
	"github.com/xssnick/tonutils-go/adnl/rldp"
	"github.com/xssnick/tonutils-go/tl"
	"sync"
)

type RLDP interface {
	Close()
	DoQuery(ctx context.Context, maxAnswerSize int64, query, result tl.Serializable) error
	SetOnQuery(handler func(transferId []byte, query *rldp.Query) error)
	SetOnDisconnect(handler func())
	SendAnswer(ctx context.Context, maxAnswerSize int64, queryId, transferId []byte, answer tl.Serializable) error
}

type RLDPWrapper struct {
	mx sync.RWMutex

	overlays map[string]*RLDPOverlayWrapper

	rootQueryHandler      func(transferId []byte, query *rldp.Query) error
	rootDisconnectHandler func()

	RLDP
}

func CreateExtendedRLDP(rldp RLDP) *RLDPWrapper {
	w := &RLDPWrapper{
		RLDP:     rldp,
		overlays: map[string]*RLDPOverlayWrapper{},
	}
	w.RLDP.SetOnQuery(w.queryHandler)
	w.RLDP.SetOnDisconnect(w.disconnectHandler)

	return w
}

func (r *RLDPWrapper) SetOnQuery(handler func(transferId []byte, query *rldp.Query) error) {
	r.rootQueryHandler = handler
}

func (r *RLDPWrapper) SetOnDisconnect(handler func()) {
	r.rootDisconnectHandler = handler
}

func (r *RLDPWrapper) queryHandler(transferId []byte, query *rldp.Query) error {
	obj, over := unwrapQuery(query.Data)
	if over != nil {
		id := hex.EncodeToString(over)
		r.mx.RLock()
		o := r.overlays[id]
		r.mx.RUnlock()
		if o == nil {
			return fmt.Errorf("got query for unregistered overlay with id: %s", id)
		}

		h := o.queryHandler
		if h == nil {
			return nil
		}
		return h(transferId, &rldp.Query{
			ID:            query.ID,
			MaxAnswerSize: query.MaxAnswerSize,
			Timeout:       query.Timeout,
			Data:          obj,
		})
	}

	h := r.rootQueryHandler
	if h == nil {
		return nil
	}
	return h(transferId, query)
}

func (r *RLDPWrapper) disconnectHandler() {
	var list []func()

	r.mx.RLock()
	for _, w := range r.overlays {
		dis := w.disconnectHandler
		if dis != nil {
			list = append(list, dis)
		}
	}
	r.mx.RUnlock()

	dis := r.rootDisconnectHandler
	if dis != nil {
		list = append(list, dis)
	}

	for _, dis = range list {
		dis()
	}
}
