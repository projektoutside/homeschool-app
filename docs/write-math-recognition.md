# 2 Players Math Write handwriting recognition

The game uses an 18,414-parameter CNN for both answer pads. The model runs in the browser with the existing TensorFlow.js runtime. Its weights and manifest total 80,572 bytes, down from 4,803,351 bytes for the previous default model and manifest. The game serves the model with its own files. The TensorFlow.js runtime still loads from the existing CDN.

The training set combines MNIST training digits and rasterized UCI Pen Digits training trajectories. Augmentation varies slant, tilt, scale, position and thickness. Inference uses three scaled and rotated views of each digit. A question supplies its expected digit count to help find a plausible boundary when two handwritten digits touch. Recognition never receives the numeric answer. Grading compares the recognized result with the answer after recognition. Unclear results invite a retry, and solo players can clear the answer pad directly.

## Research and model selection

- The [ONNX Model Zoo CNN](https://huggingface.co/onnxmodelzoo/mnist-8) was faster in a screening run with shared input preprocessing. It read fewer MNIST samples correctly (973/1,000 versus 975/1,000) and fewer UCI pen samples correctly (2,601/3,498 versus 2,680/3,498).
- [I-JEPA](https://arxiv.org/abs/2301.08243) learns general image representations. The paper does not establish faster or more accurate browser recognition for this game's digits.
- [ML Kit Digital Ink](https://developers.google.com/ml-kit/vision/digital-ink-recognition) uses ordered strokes and runs locally on Android and iOS. The published SDKs do not cover this game's common browser entry point.
- [Research on augmentation for document recognition](https://www.microsoft.com/en-us/research/publication/best-practices-for-convolutional-neural-networks-applied-to-visual-document-analysis/) informed the CNN training approach.

## Recognition comparison

Headless Chromium 156 on an Intel i7-10750H, with the same TensorFlow.js WebGL backend for both recognizers. Median timing covers warm canvas preprocessing and inference. The pause after the last stroke is outside these measurements. The old scoring path receives full credit when either prediction matches the label, as it did in the game. The upgrade receives credit only when its single returned reading matches. Unclear results count as misses.

| Corpus | Previous exact | Upgraded exact | Previous median | Upgraded median |
| --- | ---: | ---: | ---: | ---: |
| MNIST test images | 218/220 | 218/220 | 88.5 ms | 12.5 ms |
| Held-out UCI pen trajectories, rasterized | 204/280 | 262/280 | 91.2 ms | 12.1 ms |
| Composed two- and three-digit answers | 157/160 | 155/160 | 108.9 ms | 17.5 ms |
| Slanted and scaled MNIST digits | 158/160 | 157/160 | 81.2 ms | 12.4 ms |
| Crowded, overlapping two- and three-digit answers | 147/160 | 147/160 | 88.5 ms | 16.7 ms |
| QMNIST high-school student digits | 487/500 | 487/500 | 86.3 ms | 12.2 ms |
| Same student digits with slant and scale distortions | 474/500 | 479/500 | 69.6 ms | 12.1 ms |

The QMNIST test sampled 500 images from 217 high-school writers in NIST series hsf4. All came from the additional QMNIST test rows beyond the first 10,000. The student digits were written on paper. The distorted and composed cases simulate difficult spacing and handwriting. This comparison does not measure how younger children write with a finger on actual phones or tablets. [QMNIST](https://github.com/facebookresearch/qmnist) · [NIST SD19](https://www.nist.gov/srd/nist-special-database-19) · [UCI Pen Digits](https://doi.org/10.24432/C5MG6K)

The model was trained for ten epochs with PyTorch CPU, seed 617, AdamW at an initial learning rate of 0.003 and cosine decay. Three 3×3 convolution blocks have 12, 20 and 24 channels, with pooling after the first two blocks and a ten-class softmax after the dense layer at inference. The benchmark corpora were excluded from the training data. The small benchmark suites were used for model and recognition-pipeline selection, so their figures are descriptive and do not estimate accuracy for all writers.

Model weights SHA-256: `6923e17c6e98075540c784ab511164dc7b49c74df137b89255909440d3351698`.

## Gameplay verification

The scoped browser suite checks real model loading, parallel readings, an empty pad, six-digit answers, an incorrect written digit when the question expects two digits, and stale recognition across simultaneous touch inputs. Browser smoke exercises real scoring in desktop Chromium, Android phone emulation, iPhone and iPad WebKit emulation, and the same-origin iframe. Physical touchscreens and installed Capacitor packages remain unverified.

Production preview used base d5d6aca with the local game patch. recognition.js SHA-256 697d32463756de88c4571378dfff02851f03466caa226ed8fe065560483d0688. The game scripts, stylesheet, markup, manifest and weights in dist matched their source hashes.

## Follow-up — faint strokes and competitive touch

The [Telkom University kids’ digit dataset](https://doi.org/10.34820/FK2/KQX7BX) supplies isolated raster handwriting. These files contain no live touch trajectories or per-image age labels. The published validation and test archives match the repository MD5 checksums (227e771c9e817f3b591efd3903409506 and f9d774b3eacb5e32a7b1c781dc551cb9). Digit pixels were cropped from the labeled PNGs, composited as transparency into the same answer canvas and evaluated with Chromium and TensorFlow.js CPU. No participant images were added to the repository.

| Split | Original game | First CNN upgrade | With faint-stroke fix |
| --- | ---: | ---: | ---: |
| Development (400 images) | 172 | 209 | 356 |
| Test (200 images) | 90 | 110 | 182 |

All 90 answers accepted by the original game were read correctly with the fix on the test split. The strongest improvements were in faint 0s, 3s, and 5s. Only 11 of 20 sixes were correct. Nine test samples produced an unclear reading. The original and fixed median recognition times on this corpus were 84.4 ms and 7.1 ms, excluding the stroke-completion pause. This is a paired replay of existing handwriting images. Younger children writing directly on phones and tablets and physical-device gesture behavior were outside the follow-up test coverage.

Both players retain one independent stroke per visible pad. Additional contacts on an occupied pad are ignored. Overlapping touches suppress browser gestures and accidental control activation while the original pointers and match timer keep running. Each controlled gesture stays in the Math Write game. Menus retain ordinary single-finger scrolling.
