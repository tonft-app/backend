package tl

import (
	"bytes"
	"crypto/ed25519"
	"encoding/hex"
	"testing"
)

type TestInner struct {
	Double int64             `tl:"long"`
	Key    ed25519.PublicKey `tl:"int256"`
}

type TestTL struct {
	Simple          int64      `tl:"int"`
	Flags           uint32     `tl:"flags"`
	SimpleOptional  int64      `tl:"?0 long"`
	SimpleOptional2 int64      `tl:"?1 long"`
	SimpleUint      uint       `tl:"int"`
	SimpleUintBig   uint64     `tl:"long"`
	In              *TestInner `tl:"struct boxed"`
	InX             any        `tl:"struct boxed [in]"`
	In2             []any      `tl:"vector struct boxed [in]"`
	KeyEmpty        []byte     `tl:"int256"`
	Data            [][]byte   `tl:"vector bytes"`
}

func TestParse(t *testing.T) {
	Register(TestInner{}, "in 123")
	Register(TestTL{}, "root 222")

	data, _ := hex.DecodeString(
		"391523a1" + "01000000" + "05000000" + "0900000000000000" + "01000000" + "0A00000000000000" +
			"e323006f" + "0200000000000000" + "7777777777777777777777777777777777777777777777777777777777777777" +
			"e323006f" + "0800000000000000" + "7177777777777777777777777777777777777777777777777777777777777777" +
			"02000000" + "e323006f" + "0700000000000000" + "7777777777777777777777777777777777777777777777777777777777777777" + "e323006f" + "0800000000000000" + "7777777777777777777777777777777777777777777777777777777777777777" +
			"0000000000000000000000000000000000000000000000000000000000000000" + "03000000" + "00000000" + "03112233" + "0411223344" + "000000")
	var tst TestTL
	_, err := Parse(&tst, data, true)
	if err != nil {
		panic(err)
	}
	tst.KeyEmpty = nil

	data2, err := Serialize(tst, true)
	if err != nil {
		panic(err)
	}

	if !bytes.Equal(data, data2) {
		println(hex.EncodeToString(data))
		println(hex.EncodeToString(data2))

		t.Fatal("data not eq after serialize")
	}
}
