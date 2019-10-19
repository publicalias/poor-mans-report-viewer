# Poor Man's Report Viewer

Report Viewer is part of the POS system my store uses. It's an indispensable tool when you have tens of thousands of items to keep track of. It stopped working awhile ago, and since it hasn't been fixed at the store level, I wrote this script to satisfy our most common use cases.

It's based on the fact that the POS system lets you take snapshots of inventory and export them as text files. If you take two snapshots, say, a week apart, you can see what you sold in that time period. The output is a sortable table showing the differences in quantities. It runs on [GitHub Pages](https://publicalias.github.io/poor-mans-report-viewer/) and offline by downloading the repository. It supports Chrome and Firefox.

It makes the following assumptions:

1. The files use the TXT file extension.
2. Rows are separated by 1+ new lines.
3. Columns are separated by 1+ tabs.
4. The ID label matches a unique identifier such as an SKU number.
5. The quantity label matches a number.

The demo folder has some sample files so anyone can see how it works. It took some black magic to make file uploads work without a server, but hopefully it hasn't tarnished my soul too much.
