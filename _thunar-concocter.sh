#!/usr/bin/env bash
set -euo pipefail

# Directory where this local wrapper lives (project root or close enough)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path to your ONE global concocter script
GLOBAL_CONCOCTER="/home/rr-h/40-49_Projects/42_Coding/42x08_Scripts/42x08x09_Prodtools/42x08x09x16_thunar_condenser.sh"

# Base temp directory
BASE_TMP_DIR="/tmp/DigestedCode"

# Hard reset the temp outputs for this pipeline
rm -rf "${BASE_TMP_DIR}/10" "${BASE_TMP_DIR}/20" "${BASE_TMP_DIR}/9"
rm -f "${BASE_TMP_DIR}"/1C-*.groovy || true

mkdir -p "${BASE_TMP_DIR}"

# Optional: generate a filtered tree for context
cd "${SCRIPT_DIR}"
tree -I "node_modules|.git|project-management|artifacts|generated|.agent|.claude|Icons|Assets|Cursors|Fonts|Shaders|Wallpapers|Sounds|assets|_reference-material|emsdk|_deps|build*|docs|bin|build-native|build-wasm|build_native|patterns|build_wasm|colour_database|devops|obj|inspo|static|1.education|generated|target|.nuxt|.BAK.REFERENCES|.old|plan|bak.composables|bak.store|.bak|1.|backend|1.backend|1.indexer|1.src|configs|datasets|files|icons|js|notifications|images|theming|ui|wallpapers|*.x|*.groovy|ROOT|tests*|.devDocs|own.log|cleaned_log.txt|patterns|pre-processed|wallpapers|os9-main|sounds|.m2|.m2_repository|.mvn|.github|custom-instructions.md|.copilot-instructions.md|docker|importer-finder.cjs|_copy_slices.sh|_frame-prompt.md|instructions.md|_PLAN.md|reference_ui|scripts|_thunar-concocter.sh|vertical_slices.json|workflow-guide.md" \
  > "${BASE_TMP_DIR}/split-tree.md" || true

# Collect only flag arguments (-c / --compression / -e / --exclude / -h)
# Drop any positional paths so this wrapper ALWAYS uses the curated list.
# Default compression -c 1, user can override by passing their own -c
forward_args=(-c 1)

while [[ $# -gt 0 ]]; do
    case "$1" in
        -c|--compression|-e|--exclude)
            forward_args+=("$1")
            if [[ $# -gt 1 ]]; then
                forward_args+=("$2")
                shift 2
            else
                echo "Missing value for $1" >&2
                exit 1
            fi
            ;;
        -h|--help)
            # Defer help to the global script
            "${GLOBAL_CONCOCTER}" --help
            exit 0
            ;;
        *)
            # Ignore any positional path arguments; this wrapper owns the paths.
            shift
            ;;
    esac
done

# Run the global extractor, forcing it to only work on these project paths
# Do NOT use exec here, we need to continue afterwards
"${GLOBAL_CONCOCTER}" "${forward_args[@]}" \
    "${SCRIPT_DIR}/index.html" \
    "${SCRIPT_DIR}/package.json" \
    "${SCRIPT_DIR}/playwright.config.ts" \
    "${SCRIPT_DIR}/fixtures/simple.fcjson" \
    "${SCRIPT_DIR}/fixtures/simple.oxs" \
    "${SCRIPT_DIR}/src/components/" \
    "${SCRIPT_DIR}/src/converters/" \
    "${SCRIPT_DIR}/src/data/" \
    "${SCRIPT_DIR}/src/hooks/" \
    "${SCRIPT_DIR}/src/parsers/" \
    "${SCRIPT_DIR}/src/store/" \
    "${SCRIPT_DIR}/src/types/" \
    "${SCRIPT_DIR}/src/utils/" \
    "${SCRIPT_DIR}/src/symbols/" \
    "${SCRIPT_DIR}/src/sync/" \
    "${SCRIPT_DIR}/src/App.tsx" \
    "${SCRIPT_DIR}/src/index.css" \
    "${SCRIPT_DIR}/src/main.tsx"




status=$?
if [[ $status -ne 0 ]]; then
    echo "Global concocter failed with status $status" >&2
    exit "$status"
fi

# Find the most recent 1C-*.groovy in the project root
latest_file="$(
    find "${SCRIPT_DIR}" -maxdepth 1 -type f -name '1C-*.groovy' -printf '%T@ %p\n' \
    | sort -nr \
    | head -n1 \
    | cut -d' ' -f2-
)"

if [[ -z "${latest_file}" ]]; then
    echo "No output 1C-*.groovy found to move" >&2
    exit 1
fi

base_name="$(basename "${latest_file}")"

# Move new file into /tmp/DigestedCode and update path
mv "${latest_file}" "${BASE_TMP_DIR}/"
latest_file="${BASE_TMP_DIR}/${base_name}"

echo "Moved ${base_name} to ${BASE_TMP_DIR}/"

# Prepare 10 and 20 directories, replacing any existing content
dir10="${BASE_TMP_DIR}/10"
dir20="${BASE_TMP_DIR}/20"
dir9="${BASE_TMP_DIR}/9"

# They were already rm -rf'd at the top, but mkdir -p is cheap and idempotent
mkdir -p "${dir10}" "${dir20}" "${dir9}"

# Copy the file into each subdir
cp "${latest_file}" "${dir10}/"
cp "${latest_file}" "${dir20}/"
cp "${latest_file}" "${dir9}/"

# Full paths for splitter inputs
file10="${dir10}/${base_name}"
file20="${dir20}/${base_name}"
file9="${dir9}/${base_name}"

# Run the splitter scripts on the copies
"/home/rr-h/40-49_Projects/42_Coding/42x08_Scripts/42x08x09_Prodtools/42x08x09x21_10_thunar_splitter.sh" "${file10}"
"/home/rr-h/40-49_Projects/42_Coding/42x08_Scripts/42x08x09_Prodtools/42x08x09x11_thunar_splitter_4.sh" "${file20}"
"/home/rr-h/40-49_Projects/42_Coding/42x08_Scripts/42x08x09_Prodtools/42x08x09x35_9_thunar_splitter.sh" "${file9}"
