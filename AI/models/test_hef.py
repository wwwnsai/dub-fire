import numpy as np
from hailo_platform import (
    HEF, VDevice, HailoStreamInterface,
    InferVStreams, ConfigureParams,
    InputVStreamParams, OutputVStreamParams, FormatType
)

HEF_PATH = "/home/ai/Desktop/projects/dub-fire/AI/models/converted/best.hef"

def test_inference():
    hef = HEF(HEF_PATH)

    with VDevice() as device:
        configure_params = ConfigureParams.create_from_hef(hef, interface=HailoStreamInterface.PCIe)
        network_groups = device.configure(hef, configure_params)
        network_group = network_groups[0]
        network_group_params = network_group.create_params()

        input_vstreams_params = InputVStreamParams.make(network_group, format_type=FormatType.UINT8)
        output_vstreams_params = OutputVStreamParams.make(network_group, format_type=FormatType.UINT8)

        input_vstream_info = hef.get_input_vstream_infos()[0]
        h, w, c = input_vstream_info.shape
        print(f"Input shape: {h}x{w}x{c}")

        dummy_input = np.random.randint(0, 255, (1, h, w, c), dtype=np.uint8)

        with InferVStreams(network_group, input_vstreams_params, output_vstreams_params) as infer_pipeline:
            input_data = {input_vstream_info.name: dummy_input}

            with network_group.activate(network_group_params):
                output = infer_pipeline.infer(input_data)

        print("Inference successful!")
        for name, tensor in output.items():
            print(f"  Output '{name}': shape={tensor.shape}, dtype={tensor.dtype}, min={tensor.min()}, max={tensor.max()}")

if __name__ == "__main__":
    test_inference()
