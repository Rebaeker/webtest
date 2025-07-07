#!/bin/bash
OUTPUT_FILE="Codebase.txt"

echo "Starting to gather code from .astro, .js, and .ts files..."

find . -type f \( -name "*.astro" -o -name "*.js" -o -name "*.ts" \) -print0 | while IFS= read -r -d '' file; do
  # Print the opening tag with the file path
  echo "<$file>"

  # Print the content of the file
  cat "$file"

  # Print a newline to ensure the closing tag is on its own line,
  # in case the file doesn't end with a newline.
  echo

  # Print the closing tag
  echo "</$file>"
done > "$OUTPUT_FILE"

echo "Done! All content has been written to $OUTPUT_FILE"