class RNNoiseProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.frame_size = 480;
        this.filled = 0;
        this.port.onmessage = (e) => {
            WebAssembly.instantiate(e.data, {}).then((instance) => {
                this.wasm_exports = instance.exports;
                this.handle = this.wasm_exports.rnnoise_create(0);
                this.in_ptr = this.wasm_exports.malloc(this.frame_size * 4);
                this.out_ptr = this.wasm_exports.malloc(this.frame_size * 4);
                this.in_buf = new Float32Array(this.wasm_exports.memory.buffer, this.in_ptr, this.frame_size);
                this.out_buf = new Float32Array(this.wasm_exports.memory.buffer, this.out_ptr, this.frame_size);
            });
        };
    }
    process(inputs, outputs, parameters) {
        if (this.wasm_exports === undefined)
            return false;
        if (inputs.length !== 1 || outputs.length !== 1)
            return false;
        let input = inputs[0][0];
        let output = outputs[0][0];
        while (input.length > 0) {
            const sz = Math.min(input.length, this.in_buf.length - this.filled);
            for (let i = 0; i < sz; i++)
                this.in_buf[this.filled + i] = input[i] * (2 ** 15);
            this.filled += sz;
            input = input.subarray(sz);
            if (this.filled == this.in_buf.length) {
                const score = this.wasm_exports.rnnoise_process_frame(this.handle, this.out_ptr, this.in_ptr);
                this.port.postMessage(score);
                this.filled = 0;
            }
        }
    }
}
registerProcessor('rnnoise-processor', RNNoiseProcessor);
