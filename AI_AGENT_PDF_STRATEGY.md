# AI Agent And PDF Processing Strategy

Last updated: May 28, 2026

## Goal

Struction Notes will need to read and search a large amount of construction material, including drawings, submittals, RFIs, specifications, schedules, and scanned PDFs. The best approach is not to make one model do everything. Use a pipeline that extracts document content first, stores it in searchable form, and then lets a local AI agent answer questions from that indexed project data.

## Recommended Architecture

```text
Uploaded PDFs / drawings / specs
        |
        v
PDF extraction, OCR, layout parsing
        |
        v
Structured text, tables, page metadata, drawing coordinates
        |
        v
Embeddings + vector search
        |
        v
Local project agent
        |
        v
Answers with citations back to sheet/page/source
```

## NotebookLM-Style Words-First Approach

The first version should work like a source-grounded notebook. The AI should not try to visually review every PDF page every time a user asks a question. Instead, Struction Notes should extract the words first, store them with source metadata, and then answer questions from that indexed source material.

```text
PDF / drawing set
        |
        v
Extract selectable PDF text
        |
        v
OCR image-only pages or selected drawing regions
        |
        v
Split content into page, sheet, section, RFI, or submittal chunks
        |
        v
Store text + source metadata + page/sheet references
        |
        v
Generate embeddings for search
        |
        v
Retrieve the most relevant chunks for each question
        |
        v
Generate an answer with citations back to the source PDF/page
```

This approach is much cheaper and more practical than running a heavy vision model over every drawing page. It works especially well for:

- Specifications
- RFIs
- Submittals
- Meeting notes
- Drawing notes
- Sheet titles
- Title blocks
- General notes
- Schedules and legends after table extraction
- Search across a full project record

It does not fully understand drawing geometry by itself. Dimensions, symbols, visual conflicts, routing, and plan/detail relationships need a later visual layer. The first version should prioritize reliable source extraction, search, and citations.

## Storage And Retrieval Flow

After extraction, Struction Notes should store the original files, extracted text, metadata, and search vectors separately. The AI should not memorize the project. It should retrieve the relevant stored content each time a user asks a question.

```text
Upload PDF
        |
        v
Store original file
        |
        v
Extract text, OCR, tables, page data, and sheet data
        |
        v
Split extracted content into searchable chunks
        |
        v
Store chunks with source metadata
        |
        v
Generate embeddings for semantic search
        |
        v
User asks a question
        |
        v
Retrieve matching chunks
        |
        v
Send only relevant chunks to the AI
        |
        v
Return answer with citations back to source files/pages/sheets
```

Recommended storage responsibilities:

| Storage Area | Stores | Purpose |
| --- | --- | --- |
| Firebase Storage | Original PDFs, drawing sets, specs, submittals, RFIs, and attachments | Keeps the source files available for download, viewing, and citation links. |
| Firestore | Document records, page records, sheet numbers, titles, extracted chunks, page references, and processing status | Stores structured project document data used by the app. |
| Vector database | Embeddings for each extracted text chunk | Enables semantic search, so questions can find relevant text even when wording differs. |
| AI server | Prompts, retrieval logic, model calls, and response formatting | Connects the app, vector search, and local/cloud AI model. |

Example extracted chunk:

```json
{
  "projectId": "usps-wpb",
  "documentId": "drawing-set-001",
  "sourceFile": "A-Drawings.pdf",
  "page": 14,
  "sheetNumber": "A2.11",
  "sheetTitle": "Floor Plan - Level 2",
  "chunkText": "Fire dampers shall be installed at rated wall penetrations...",
  "boundingBox": {
    "x": 1200,
    "y": 850,
    "width": 420,
    "height": 90
  }
}
```

When a user asks, "Which sheets mention fire dampers?", the system should:

1. Convert the question into a search embedding.
2. Search the stored vectors for matching chunks.
3. Load the matching chunk text and metadata.
4. Send those chunks to the AI model.
5. Return an answer with source citations such as file name, page number, and sheet number.

This keeps answers cheaper, faster, and easier to verify because the AI response can point back to the original source material.

## Recommended Model Stack

| Use Case | Recommended Tool / Model | Why |
| --- | --- | --- |
| Text-heavy specs | Docling or Marker | Converts PDFs into Markdown/JSON for indexing. |
| RFIs and submittals | Docling or Marker | Good for normal construction documents with text, tables, and attachments. |
| Tables and schedules | PaddleOCR PP-StructureV3 or Docling | Better at layout, tables, formulas, and reading order. |
| Scanned PDFs | OCR first, then RAG | The chat model should not read raw scanned pages directly. |
| Drawings and title blocks | OCR + coordinate storage | Drawings need page/sheet coordinates, not just text. |
| Drawing visual checks | Qwen2.5-VL-3B-Instruct where supported | Useful for image/layout questions, but should not be the only drawing parser. |
| Project search | Qwen3-Embedding-0.6B, BAAI/bge-m3, or all-MiniLM-L6-v2 | Turns extracted project text into searchable vectors. |
| Local answer agent | Qwen2.5-1.5B or another Hailo-supported small LLM | Practical size for Raspberry Pi AI HAT+ 2 local inference. |

## Raspberry Pi Guidance

For local AI, use a Raspberry Pi 5 with Raspberry Pi AI HAT+ 2 if possible. The AI HAT+ 2 supports local LLM and VLM workloads through Hailo tooling. Older Raspberry Pi AI Kit / AI HAT+ hardware is better suited for vision/object detection and is not the right primary target for local chat agents.

The Pi should usually answer questions from already indexed content. Heavy PDF ingestion can run as a batch process so the Pi is not trying to visually reason over every page in real time.

## Best First Implementation

Start with retrieval-augmented generation instead of training.

1. Upload a PDF to the project.
2. Extract selectable text first.
3. Run OCR only where needed for scanned pages, title blocks, schedules, legends, or drawing notes.
4. Extract tables and page metadata using Docling, Marker, or PaddleOCR.
5. Chunk the extracted content by page, sheet, section, spec division, RFI, or submittal package.
6. Generate embeddings for each chunk.
7. Store chunk text, source file, page number, sheet number, and bounding box if available.
8. When the user asks a question, retrieve the most relevant chunks.
9. Send only those chunks to the local agent.
10. Return an answer with source references.

## Phased Rollout

| Phase | Goal | Notes |
| --- | --- | --- |
| Phase 1 | Words-first extraction and search | Extract text from PDFs, OCR missing text, chunk it, embed it, and answer with citations. |
| Phase 2 | Table and schedule extraction | Improve schedules, legends, submittal logs, door schedules, equipment schedules, and spec tables. |
| Phase 3 | Drawing region OCR | Store OCR text with drawing coordinates so answers can point to sheet regions. |
| Phase 4 | Visual drawing AI | Add VLM or custom vision models for symbols, fixtures, equipment tags, and visual plan checks. |

## Drawing-Specific Notes

Drawings need more than basic text extraction. A good drawing pipeline should store:

- Sheet number and sheet title
- Revision/date information
- OCR text from notes, schedules, legends, and title blocks
- Page coordinates for found text
- Cropped regions for schedules, legends, and details
- Links back to the original PDF page

Later, custom vision models can be added for symbols, fixtures, doors, equipment tags, or other repeated plan elements.

## Training Guidance

Do not start with full model training. The better order is:

1. Prompting: define what each agent does.
2. RAG: make project documents searchable.
3. Structured extraction: teach the system what fields to pull from RFIs, submittals, and specs.
4. Fine-tuning or LoRA: only after there is enough real usage data showing repeated failures.

For this project, training is a later optimization. Good extraction, indexing, and citations will matter more at the beginning.

## Suggested Agents

| Agent | Job |
| --- | --- |
| Project Assistant | Answers project questions from notes, tasks, drawings, RFIs, submittals, and specs. |
| Specification Assistant | Finds spec sections, requirements, submittal requirements, closeout items, and warranty requirements. |
| Drawing Assistant | Searches sheet text, title blocks, schedules, and drawing notes. |
| RFI Assistant | Summarizes RFIs, extracts open questions, tracks responsible parties, and connects RFIs to affected drawings/specs. |
| Submittal Assistant | Summarizes submittals, identifies status, reviewer comments, required resubmittals, and linked spec sections. |
| Task Assistant | Converts notes, RFIs, and meeting items into tasks. |

## Sources

- Raspberry Pi AI software documentation: https://www.raspberrypi.com/documentation/computers/ai.html
- Raspberry Pi AI HAT+ documentation: https://www.raspberrypi.com/documentation/accessories/ai-hat-plus.html
- Raspberry Pi AI HAT+ 2 announcement: https://www.raspberrypi.com/news/introducing-the-raspberry-pi-ai-hat-plus-2-generative-ai-on-raspberry-pi-5/
- Docling: https://www.docling.ai/
- Marker: https://github.com/datalab-to/marker
- PaddleOCR PP-StructureV3: https://www.paddleocr.ai/main/en/version3.x/algorithm/PP-StructureV3/PP-StructureV3.html
- Qwen2.5-VL-3B-Instruct: https://huggingface.co/Qwen/Qwen2.5-VL-3B-Instruct
- Qwen3-Embedding-0.6B: https://huggingface.co/Qwen/Qwen3-Embedding-0.6B
- BAAI/bge-m3: https://huggingface.co/BAAI/bge-m3
- all-MiniLM-L6-v2: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
