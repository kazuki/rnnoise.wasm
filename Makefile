EMCC_OPTS=-O2 -s EXPORTED_FUNCTIONS="['_rnnoise_process_frame', '_rnnoise_init', '_rnnoise_destroy', '_rnnoise_create', '_rnnoise_get_size']"
PATH := ./node_modules/.bin:$(PATH)

all: librnnoise.wasm librnnoise.js librnnoise.worker.js test.js
clean:
	rm -f librnnoise.wasm; (cd rnnoise; git clean -fd > /dev/null)

librnnoise.wasm: rnnoise/.libs/librnnoise.a
	emcc -o $@ $(EMCC_OPTS) $^

rnnoise/.libs/librnnoise.a:
	cd rnnoise && ./autogen.sh && emconfigure ./configure --disable-examples --disable-doc && emmake make

%.js: %.ts
	tsc -t ES2017 --out $@ $^
