# Meridian

Portfolio lab for a computer-vision and warehouse-automation role. Two benches run in the browser:

- **Visual search.** Upload a photo or pick a catalog color. A color histogram is the embedding. Products are ranked by cosine similarity, with query time, match score, and a "complete the look" set.
- **Pack line.** An order is SKU-checked, then a shelf packer chooses the smallest carton, draws the footprint, and reports void fill and dim weight. Packing the same order again is an idempotent replay.
- **Runbook.** How the demo maps onto a production pipeline (trigger, embed, act, hold queue, metrics).

This is a working model, not a live vision transformer or a robot. In production the histogram would be a ViT embedding in a vector database, and the packer would talk to a warehouse system and a carton cutter.

## Run

```bash
npm install
npm run dev
```

Open the local dev URL printed by Vite.

## Stack

React, TanStack Start, Tailwind CSS v4. No account or database is required. Catalog, embeddings, and packing all run in the browser.
