import torch
import numpy as np
from PIL import Image
import gradio as gr
from diffusers import StableDiffusionInpaintPipeline

# Check for GPU availability
device = "cuda" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if device == "cuda" else torch.float32

print(f"Loading Stable Diffusion Inpainting model on {device}...")
# Note: Ensure you use an inpainting-compatible checkpoint
MODEL_ID = "runwayml/stable-diffusion-inpainting"

pipeline = StableDiffusionInpaintPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=torch_dtype,
    safety_checker=None
)
pipeline = pipeline.to(device)

def process_inpaint(dict_input, prompt, negative_prompt, strength, steps, guidance):
    """
    Handles the image and mask input from Gradio's ImageEditor component 
    and executes the local diffusion pipeline.
    """
    if dict_input is None or "background" not in dict_input:
        return None

    # Gradio ImageEditor passes a dictionary containing 'background' and 'layers' (mask)
    init_image = dict_input["background"].convert("RGB")
    
    # Extract the drawn mask layer if present
    if "layers" in dict_input and len(dict_input["layers"]) > 0:
        mask_image = dict_input["layers"][0].convert("L")
    else:
        # Fallback empty mask if nothing was drawn
        mask_image = Image.new("L", init_image.size, 0)

    # Resize images to standard 512x512 for pipeline compatibility (or keep original if VRAM permits)
    init_image = init_image.resize((512, 512))
    mask_image = mask_image.resize((512, 512))

    print(f"Running generation with prompt: '{prompt}'...")

    # Execute diffusion inpainting
    result = pipeline(
        prompt=prompt,
        negative_prompt=negative_prompt,
        image=init_image,
        mask_image=mask_image,
        strength=strength,
        num_inference_steps=int(steps),
        guidance_scale=guidance
    ).images[0]

    return result

# Build the Gradio Web UI Layout
with gr.Blocks(title="Local Image Editor") as demo:
    gr.Markdown("# Local Inpainting & Body Adjustment Web UI")
    gr.Markdown("Upload an image, use the brush tool to mask the target area, and enter a prompt to guide the modification.")

    with gr.Row():
        with gr.Column(scale=2):
            # Interactive canvas supporting image upload and mask drawing
            canvas = gr.ImageEditor(
                label="Source Image & Mask Canvas",
                type="pil",
                interactive=True,
                sources=["upload", "clipboard"]
            )
            
            prompt_input = gr.Textbox(
                label="Prompt (e.g., 'curvy silhouette, enhanced proportions, natural blending')",
                value="realistic modification, natural lighting"
            )
            negative_prompt_input = gr.Textbox(
                label="Negative Prompt",
                value="bad anatomy, distortion, blurry, low quality"
            )

            with gr.Row():
                strength_slider = gr.Slider(minimum=0.1, maximum=1.0, value=0.75, step=0.05, label="Denoising Strength")
                steps_slider = gr.Slider(minimum=10, maximum=50, value=30, step=1, label="Inference Steps")
                guidance_slider = gr.Slider(minimum=1.0, maximum=20.0, value=7.5, step=0.5, label="Guidance Scale")

            submit_btn = gr.Button("Generate Modification", variant="primary")

        with gr.Column(scale=2):
            output_image = gr.Image(label="Processed Output")

    submit_btn.click(
        fn=process_inpaint,
        inputs=[
            canvas, 
            prompt_input, 
            negative_prompt_input, 
            strength_slider, 
            steps_slider, 
            guidance_slider
        ],
        outputs=output_image
    )

if __name__ == "__main__":
    # Launches a local web server (e.g., http://127.0.0.1:7860)
    demo.launch(server_name="127.0.0.1", server_port=7860, share=False)
pip install torch torchvision diffusers transformers accelerate pillow gradio
python app.py
