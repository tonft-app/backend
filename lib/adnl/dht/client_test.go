package dht

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"github.com/xssnick/tonutils-go/adnl"
	"github.com/xssnick/tonutils-go/adnl/address"
	"github.com/xssnick/tonutils-go/liteclient"
	"github.com/xssnick/tonutils-go/tl"
	"net"
	"reflect"
	"strconv"
	"testing"
	"time"
)

type MockGateway struct {
	reg func(addr string, key ed25519.PublicKey) (adnl.Peer, error)
}

func (m *MockGateway) RegisterClient(addr string, key ed25519.PublicKey) (adnl.Peer, error) {
	return m.reg(addr, key)
}

type MockADNL struct {
	query func(ctx context.Context, req, result tl.Serializable) error
	close func()
}

func (m MockADNL) SetCustomMessageHandler(handler func(msg *adnl.MessageCustom) error) {
	return
}

func (m MockADNL) SetQueryHandler(handler func(msg *adnl.MessageQuery) error) {
	return
}

func (m MockADNL) SendCustomMessage(ctx context.Context, req tl.Serializable) error {
	return nil

}

func (m MockADNL) Answer(ctx context.Context, queryID []byte, result tl.Serializable) error {
	return nil
}

func (m MockADNL) GetID() []byte {
	return nil
}

func (m MockADNL) RemoteAddr() string {
	return ""
}

func (m MockADNL) Query(ctx context.Context, req, result tl.Serializable) error {
	return m.query(ctx, req, result)
}

func (m MockADNL) SetDisconnectHandler(handler func(addr string, key ed25519.PublicKey)) {}

func (m MockADNL) Close() {}

var cnf = &liteclient.GlobalConfig{
	Type: "config.global",
	DHT: liteclient.DHTConfig{
		Type: "dht.config.global",
		K:    6,
		A:    3,
		StaticNodes: liteclient.DHTNodes{
			Type: "dht.node",
			Nodes: []liteclient.DHTNode{
				{
					Type: "dht.node",
					ID: liteclient.ServerID{
						Type: "pub.ed25519",
						Key:  "6PGkPQSbyFp12esf1NqmDOaLoFA8i9+Mp5+cAx5wtTU="},
					AddrList: liteclient.DHTAddressList{
						Type: "adnl.addressList",
						Addrs: []liteclient.DHTAddress{
							{
								"adnl.address.udp",
								-1185526007,
								22096,
							},
						}},
					Version:   -1,
					Signature: "L4N1+dzXLlkmT5iPnvsmsixzXU0L6kPKApqMdcrGP5d9ssMhn69SzHFK+yIzvG6zQ9oRb4TnqPBaKShjjj2OBg==",
				},
				{
					Type: "dht.node",
					ID: liteclient.ServerID{
						Type: "pub.ed25519",
						Key:  "bn8klhFZgE2sfIDfvVI6m6+oVNi1nBRlnHoxKtR9WBU="},
					AddrList: liteclient.DHTAddressList{
						Type: "adnl.addressList",
						Addrs: []liteclient.DHTAddress{
							{
								"adnl.address.udp",
								-1307380860,
								15888,
							},
						}},
					Version:   -1,
					Signature: "fQ5zAa6ot4pfFWzvuJOR8ijM5ELWndSDsRhFKstW1tqVSNfwAdOC7tDC8mc4vgTJ6fSYSWmhnXGK/+T5f6sDCw==",
				},
			},
		},
	},
	Liteservers: nil,
	Validator:   liteclient.ValidatorConfig{},
}

func makeStrAddress(ip int32, port int) string {
	_ip := make(net.IP, 4)
	binary.BigEndian.PutUint32(_ip, uint32(ip))
	return _ip.String() + ":" + strconv.Itoa(port)
}

func newCorrectNode(a byte, b byte, c byte, d byte, port int32) (*Node, error) {
	tPubKey, tPrivKey, err := ed25519.GenerateKey(nil)
	if err != nil {
		return nil, err
	}
	testNode := &Node{
		adnl.PublicKeyED25519{Key: tPubKey},
		&address.List{
			Addresses: []*address.UDP{
				{net.IPv4(a, b, c, d).To4(),
					port,
				},
			},
			Version:    0,
			ReinitDate: 0,
			Priority:   0,
			ExpireAt:   0,
		},
		1671102718,
		nil,
	}

	toVerify, err := tl.Serialize(testNode, true)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize node: %w", err)
	}
	sign := ed25519.Sign(tPrivKey, toVerify)
	testNode.Signature = sign
	return testNode, nil
}

func correctValue(tAdnlAddr []byte) (*ValueFoundResult, error) {
	pubId, err := base64.StdEncoding.DecodeString("kn0+cePOZRw/FyE005Fj9w5MeSFp4589Ugv62TiK1Mo=")
	if err != nil {
		return nil, err
	}
	pubIdRes := adnl.PublicKeyED25519{pubId}
	sign, err := base64.StdEncoding.DecodeString("Zwj4eW/tMbgzF7kQtI8AF11E0q76h5/3+hkylzHuJzKDD2sDd7sw/FXIiVptjrrOIPze8kbbDEkq4K5O78KeDQ==")
	if err != nil {
		return nil, err
	}
	data, err := base64.StdEncoding.DecodeString("WOYnIgEAAADnpg1nkp5cpAUNAAD6Zphj+maYYwAAAAAAAAAA")
	if err != nil {
		return nil, err
	}
	sign2, err := base64.StdEncoding.DecodeString("+1cttR4nsAC0UsZwZTfDwvraxK9NxOjU0pXATkftiEyDgvbyLzPt24lOHl9B756NWBlv8NzqswhNiq7V+SV6Aw==")
	if err != nil {
		return nil, err
	}

	tValue := &ValueFoundResult{
		Value: Value{
			KeyDescription: KeyDescription{
				Key: Key{
					ID:    tAdnlAddr,
					Name:  []byte("address"),
					Index: 0,
				},
				ID:         pubIdRes,
				UpdateRule: UpdateRuleSignature{},
				Signature:  sign,
			},
			Data:      data,
			TTL:       1671121877,
			Signature: sign2,
		},
	}
	return tValue, nil
}

func TestClient_FindValue(t *testing.T) {
	existingValue := "516618cf6cbe9004f6883e742c9a2e3ca53ed02e3e36f4cef62a98ee1e449174"
	siteAddr, err := hex.DecodeString(existingValue)
	if err != nil {
		t.Fatal("failed to prepare test site address, err: ", err.Error())
	}

	tValue, err := correctValue(siteAddr)
	if err != nil {
		t.Fatal("failed to prepare test value, err:")
	}

	tests := []struct {
		name, addr string
		want       error
	}{
		{"existing address", "516618cf6cbe9004f6883e742c9a2e3ca53ed02e3e36f4cef62a98ee1e449174", nil},
		{"missing address", "1537ee02d6d0a65185630084427a26eafdc11ad24566d835291a43b780701f0e", ErrDHTValueIsNotFound},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			gateway := &MockGateway{}
			gateway.reg = func(addr string, peerKey ed25519.PublicKey) (adnl.Peer, error) {
				return &MockADNL{
					query: func(ctx context.Context, req, result tl.Serializable) error {
						switch request := req.(type) {
						case Ping:
							reflect.ValueOf(result).Elem().Set(reflect.ValueOf(Pong{ID: request.ID}))
						case tl.Raw:
							var _req FindValue
							_, err := tl.Parse(&_req, request, true)
							if err != nil {
								t.Fatal(err)
							}

							k, err := adnl.ToKeyID(&Key{
								ID:    siteAddr,
								Name:  []byte("address"),
								Index: 0,
							})
							if err != nil {
								t.Fatal(err)
							}

							if bytes.Equal(k, _req.Key) {
								reflect.ValueOf(result).Elem().Set(reflect.ValueOf(*tValue))
							} else {
								reflect.ValueOf(result).Elem().Set(reflect.ValueOf(ValueNotFoundResult{Nodes: NodesList{nil}}))
							}
						}
						return nil
					},
				}, nil
			}

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			dhtCli, err := NewClientFromConfig(ctx, gateway, cnf)
			if err != nil {
				t.Fatal(err)
			}

			siteAddr, err := hex.DecodeString(test.addr)
			if err != nil {
				t.Fatal(err)
			}

			time.Sleep(1 * time.Second)

			res, _, got := dhtCli.FindValue(context.Background(), &Key{
				ID:    siteAddr,
				Name:  []byte("address"),
				Index: 0,
			})
			if got != test.want {
				t.Errorf("got '%v', want '%v'", got, test.want)
			}

			if test.name == "existing address" {
				if !reflect.DeepEqual(res, &tValue.Value) {
					t.Errorf("got bad data")
				}
			}
		})
	}
}

func TestClient_NewClientFromConfig(t *testing.T) {
	byteKey1, err := base64.StdEncoding.DecodeString("6PGkPQSbyFp12esf1NqmDOaLoFA8i9+Mp5+cAx5wtTU=")
	if err != nil {
		t.Fatal("failed to decode test public key, err: ", err)
	}

	pubKey1 := ed25519.PublicKey(byteKey1)
	adnlPubKey1 := adnl.PublicKeyED25519{Key: pubKey1}

	tKeyId1, err := adnl.ToKeyID(adnlPubKey1)
	if err != nil {
		t.Fatal("failed to prepare test key id, err: ", err)
	}

	hexTKeyId1 := hex.EncodeToString(tKeyId1)

	tAddr1 := makeStrAddress(-1185526007, 22096)

	node1 := dhtNode{
		id:        tKeyId1,
		addr:      tAddr1,
		serverKey: pubKey1,
	}

	byteKey2, err := base64.StdEncoding.DecodeString("bn8klhFZgE2sfIDfvVI6m6+oVNi1nBRlnHoxKtR9WBU=")
	if err != nil {
		t.Fatal("failed to decode test public key, err: ", err)
	}

	pubKey2 := ed25519.PublicKey(byteKey2)
	adnlPubKey2 := adnl.PublicKeyED25519{Key: pubKey2}

	tKeyId2, err := adnl.ToKeyID(adnlPubKey2)
	if err != nil {
		t.Fatal("failed to prepare test key id, err: ", err)
	}

	hexTKeyId2 := hex.EncodeToString(tKeyId2)

	tAddr2 := makeStrAddress(-1307380860, 15888)

	node2 := dhtNode{
		id:        tKeyId2,
		addr:      tAddr2,
		serverKey: pubKey2,
	}

	tests := []struct {
		name         string
		tNode1       dhtNode
		tNode2       dhtNode
		wantLenNodes int
		checkAdd1    bool
		checkAdd2    bool
	}{
		{
			"positive case (all nodes valid)", node1, node2, 2, true, true,
		},
		{
			"negative case (one of two nodes with bad sign)", node1, node2, 1, true, false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			gateway := &MockGateway{}
			gateway.reg = func(addr string, peerKey ed25519.PublicKey) (adnl.Peer, error) {
				return MockADNL{
					query: func(ctx context.Context, req, result tl.Serializable) error {
						switch request := req.(type) {
						case Ping:
							if test.name == "positive case (all nodes valid)" {
								reflect.ValueOf(result).Elem().Set(reflect.ValueOf(Pong{ID: request.ID}))
							} else if test.name == "negative case (one of two nodes with bad sign)" {
								if addr == tAddr1 {
									reflect.ValueOf(result).Elem().Set(reflect.ValueOf(Pong{ID: request.ID}))
								} else if addr == tAddr2 {
									return errors.New("node is not answering")
								}
							}
						default:
							return fmt.Errorf("mock err: unsupported request type '%s'", reflect.TypeOf(req).String())
						}
						return nil
					},
				}, nil
			}

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()

			cli, err := NewClientFromConfig(ctx, gateway, cnf)
			if err != nil {
				t.Fatal(err)
			}

			time.Sleep(1 * time.Second)

			if len(cli.activeNodes) != test.wantLenNodes || len(cli.knownNodesInfo) != test.wantLenNodes {
				t.Errorf("added nodes count (active'%d', known'%d') but expected(%d)", len(cli.activeNodes), len(cli.knownNodesInfo), test.wantLenNodes)
			}

			resDhtNode1, ok1 := cli.activeNodes[hexTKeyId1]
			if ok1 != test.checkAdd1 {
				t.Errorf("invalid active nodes addition")
			}
			if ok1 {
				if !bytes.Equal(resDhtNode1.id, test.tNode1.id) {
					t.Errorf("invalid active node id")
				}
				if resDhtNode1.addr != test.tNode1.addr {
					t.Errorf("invalid active node address")
				}
				if !resDhtNode1.serverKey.Equal(test.tNode1.serverKey) {
					t.Errorf("invalid active node server key")
				}
			}

			resDhtNode2, ok2 := cli.activeNodes[hexTKeyId2]
			if ok2 != test.checkAdd2 {
				t.Errorf("invalid active nodes addition")
			}

			if ok2 {
				if !bytes.Equal(resDhtNode2.id, test.tNode2.id) {
					t.Errorf("invalid active node id")
				}
				if resDhtNode2.addr != test.tNode2.addr {
					t.Errorf("invalid active node address")
				}
				if !resDhtNode2.serverKey.Equal(test.tNode2.serverKey) {
					t.Errorf("invalid active node server key")
				}
			}
		})
	}
}

func TestClient_FindAddressesUnit(t *testing.T) {
	testAddr := "516618cf6cbe9004f6883e742c9a2e3ca53ed02e3e36f4cef62a98ee1e449174" // ADNL address of foundation.ton
	adnlAddr, err := hex.DecodeString(testAddr)
	if err != nil {
		t.Fatal("failed creating test value, err:", err)
	}

	value, err := correctValue(adnlAddr) //correct value if searching adnl "addr"
	if err != nil {
		t.Fatal("failed creating test value, err: ", err.Error())
	}

	valueToAddrList, err := correctValue(adnlAddr)
	if err != nil {
		t.Fatal("failed creating test value, err: ", err.Error())
	}
	var tAddrList address.List
	_, err = tl.Parse(&tAddrList, valueToAddrList.Value.Data, true)
	if err != nil {
		t.Fatal("failed to parse test address list: ", err)
	}

	pubId, err := base64.StdEncoding.DecodeString("kn0+cePOZRw/FyE005Fj9w5MeSFp4589Ugv62TiK1Mo=")
	if err != nil {
		t.Fatal("failed creating pId of test value, err:", err)
	}
	tPubIdRes := adnl.PublicKeyED25519{Key: pubId}

	t.Run("find addresses positive case", func(t *testing.T) {
		gateway := &MockGateway{}
		gateway.reg = func(addr string, peerKey ed25519.PublicKey) (adnl.Peer, error) {
			return MockADNL{
				query: func(ctx context.Context, req, result tl.Serializable) error {
					switch request := req.(type) {
					case Ping:
						reflect.ValueOf(result).Elem().Set(reflect.ValueOf(Pong{ID: request.ID}))
					case tl.Raw:
						var _req FindValue
						_, err := tl.Parse(&_req, request, true)
						if err != nil {
							t.Fatal("failed to prepare test data, err", err)
						}

						k, err := adnl.ToKeyID(&Key{
							ID:    adnlAddr,
							Name:  []byte("address"),
							Index: 0,
						})
						if err != nil {
							t.Fatal(err)
						}

						if bytes.Equal(k, _req.Key) {
							reflect.ValueOf(result).Elem().Set(reflect.ValueOf(*value))
						} else {
							reflect.ValueOf(result).Elem().Set(reflect.ValueOf(ValueNotFoundResult{Nodes: NodesList{nil}}))
						}
					default:
						return fmt.Errorf("mock err: unsupported request type '%s'", reflect.TypeOf(req).String())
					}
					return nil
				},
			}, nil
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		cli, err := NewClientFromConfig(ctx, gateway, cnf)
		if err != nil {
			t.Fatal("failed to prepare test client, err:", err)
		}

		addrList, pubKey, err := cli.FindAddresses(context.Background(), adnlAddr)
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(tPubIdRes.Key, pubKey) {
			t.Error("invalid pubKey received")
		}

		if !reflect.DeepEqual(&tAddrList, addrList) {
			t.Error("invalid address list received")
		}
	})
}

func TestClient_FindAddressesIntegration(t *testing.T) {
	_, priv, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}

	gateway := adnl.NewGateway(priv)
	err = gateway.StartClient()
	if err != nil {
		t.Fatal(err)
	}

	// restore after unit tests
	testAddr := "516618cf6cbe9004f6883e742c9a2e3ca53ed02e3e36f4cef62a98ee1e449174" // ADNL address of foundation.ton

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	dhtClient, err := NewClientFromConfigUrl(ctx, gateway, "https://ton-blockchain.github.io/global.config.json")
	if err != nil {
		t.Fatalf("failed to init DHT client: %s", err.Error())
	}

	time.Sleep(2 * time.Second)

	siteAddr, err := hex.DecodeString(testAddr)
	if err != nil {
		t.Fatal(err)
	}

	_, _, err = dhtClient.FindAddresses(ctx, siteAddr)
	if err != nil {
		t.Fatal(err)
	}
}

func TestClient_Close(t *testing.T) {
	gateway := &MockGateway{}
	gateway.reg = func(addr string, peerKey ed25519.PublicKey) (adnl.Peer, error) {
		return MockADNL{
			query: func(ctx context.Context, req, result tl.Serializable) error {
				switch request := req.(type) {
				case Ping:
					reflect.ValueOf(result).Elem().Set(reflect.ValueOf(Pong{ID: request.ID}))
				default:
					return fmt.Errorf("mock err: unsupported request type '%s'", reflect.TypeOf(request).String())
				}
				return nil
			},
			close: func() {
			},
		}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cli, err := NewClientFromConfig(ctx, gateway, cnf)
	if err != nil {
		t.Fatal("failed to prepare test client, err: ", err)
	}
	t.Run("close client test", func(t *testing.T) {
		cli.Close()
		if cli.activeNodes != nil {
			t.Error("found active nodes in client after 'Close' operation")
		}
		for _, node := range cli.activeNodes {
			if node.adnl != nil {
				t.Errorf("found connected node (id: %s) after 'Close' operation", hex.EncodeToString(node.id))
			}
		}

	})
}

func TestClient_Store(t *testing.T) {
	addrList := address.List{
		Addresses: []*address.UDP{
			{
				net.IPv4(1, 1, 1, 1).To4(),
				11111,
			},
			{
				net.IPv4(2, 2, 2, 2).To4(),
				22222,
			},
			{
				net.IPv4(3, 3, 3, 3).To4(),
				333333,
			},
		},
		Version:    0,
		ReinitDate: 0,
		Priority:   0,
		ExpireAt:   0,
	}
	tlAddrList, err := tl.Serialize(addrList, true)
	if err != nil {
		t.Fatal()
	}

	nameAddr := []byte("address")
	var index int32 = 0

	cliePubK, err := hex.DecodeString("93037f2613f6063869544caacac3eabbd7456e4d6e731478fccc961c137d1284")
	if err != nil {
		t.Fatal("failed to prepare test client pub key, err: ", err)
	}

	cliePrivK, err := hex.DecodeString("83590f541d37b783aa504049bab792696d12bbec3d23a954353300f816ca8b9693037f2613f6063869544caacac3eabbd7456e4d6e731478fccc961c137d1284")
	if err != nil {
		t.Fatal("failed to prepare test id, err: ", err)
	}

	_, err = adnl.ToKeyID(adnl.PublicKeyED25519{cliePubK})
	if err != nil {
		t.Fatal("failed to prepare test key id, err: ", err)
	}

	NodePKey, err := hex.DecodeString("135da090fa178b960de48655108b50b5ed3a09942f44a0a505c76cbd171d4ae9")
	if err != nil {
		t.Fatal("failed to prepare test id, err: ", err)
	}

	NodeSign, err := hex.DecodeString("f06b491e4cc26afd989e2409a1fb155d993567dde9a68b1603d35df6a390195b757f2aca3968a46493f5ee513f5f040c10b6e21b988f48e0781fe81aa9226d05")
	if err != nil {
		t.Fatal("failed to prepare test sign, err: ", err)
	}
	testNode := &Node{
		adnl.PublicKeyED25519{Key: NodePKey},
		&address.List{
			Addresses: []*address.UDP{
				{net.IPv4(6, 6, 6, 6).To4(),
					65432,
				},
			},
			Version:    0,
			ReinitDate: 0,
			Priority:   0,
			ExpireAt:   0,
		},
		1671102718,
		NodeSign,
	}

	t.Run("positive store case", func(t *testing.T) {
		gateway := &MockGateway{}
		gateway.reg = func(addr string, peerKey ed25519.PublicKey) (adnl.Peer, error) {
			return MockADNL{
				query: func(ctx context.Context, req, result tl.Serializable) error {
					switch request := req.(type) {
					case Ping:
						reflect.ValueOf(result).Elem().Set(reflect.ValueOf(Pong{ID: request.ID}))
					case tl.Raw:
						var rowReq any
						_, err := tl.Parse(&rowReq, request, true)
						if err != nil {
							t.Fatal("failed to parse test request, err: ", err)
						}
						switch rowReqType := rowReq.(type) {
						case FindNode:
							if addr == "185.86.79.9:22096" {
								reflect.ValueOf(result).Elem().Set(reflect.ValueOf(NodesList{[]*Node{testNode}}))
							} else if addr == "" {

							} else {
								reflect.ValueOf(result).Elem().Set(reflect.ValueOf(NodesList{nil}))
							}
						case Store:
							if addr != "6.6.6.6:65432" && addr != "178.18.243.132:15888" {
								t.Errorf("invalid node to store: check priority list")
							}
							sign := rowReqType.Value.Signature
							rowReqType.Value.Signature = nil
							dataToCheck, err := tl.Serialize(rowReqType.Value, true)
							if err != nil {
								t.Fatal("failed to serialize test value, err: ", err)
							}
							check := ed25519.Verify(rowReqType.Value.KeyDescription.ID.(adnl.PublicKeyED25519).Key, dataToCheck, sign)
							if check != true {
								t.Log("bad sign received!")
								return fmt.Errorf("bad data (invalide sign)")
							} else {
								reflect.ValueOf(result).Elem().Set(reflect.ValueOf(Stored{}))
							}
						}
					default:
						t.Fatalf("mock err: unsupported request type '%s'", reflect.TypeOf(request).String())
					}
					return nil
				},
				close: func() {
				},
			}, nil
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		cli, err := NewClientFromConfig(ctx, gateway, cnf)
		if err != nil {
			t.Fatal("failed to prepare test client, err: ", err)
		}
		time.Sleep(100 * time.Millisecond)

		count, _, err := cli.Store(context.Background(), nameAddr, index, tlAddrList, time.Hour, cliePrivK, 2)
		if err != nil {
			t.Errorf(err.Error())
		}
		if count != 2 {
			t.Errorf("got '%d' copies count, want '2'", count)
		}
	})
}
