#!/bin/bash

# TypeScript Error Analysis Script
# This script analyzes TypeScript errors from CI logs and categorizes them

echo "🔍 TypeScript Error Analysis Tool"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create temp directory for analysis
TEMP_DIR="/tmp/ts-error-analysis"
mkdir -p "$TEMP_DIR"

# Function to fetch latest CI logs
fetch_ci_logs() {
    echo -e "${BLUE}Fetching latest CI build logs...${NC}"
    
    # Get the latest failed build
    LATEST_RUN=$(gh run list --workflow "CI Pipeline" --repo freaghill/hangjegyzet --status failure --limit 1 --json databaseId --jq '.[0].databaseId')
    
    if [ -z "$LATEST_RUN" ]; then
        echo -e "${YELLOW}No failed CI runs found. Trying any recent run...${NC}"
        LATEST_RUN=$(gh run list --repo freaghill/hangjegyzet --limit 1 --json databaseId --jq '.[0].databaseId')
    fi
    
    if [ -n "$LATEST_RUN" ]; then
        echo "Fetching logs from run: $LATEST_RUN"
        gh run view "$LATEST_RUN" --log-failed --repo freaghill/hangjegyzet > "$TEMP_DIR/ci-errors.log" 2>/dev/null || \
        gh run view "$LATEST_RUN" --log --repo freaghill/hangjegyzet > "$TEMP_DIR/ci-errors.log" 2>/dev/null
    else
        echo -e "${RED}Could not fetch CI logs${NC}"
        return 1
    fi
}

# Function to extract TypeScript errors
extract_ts_errors() {
    echo -e "${BLUE}Extracting TypeScript errors...${NC}"
    
    # Extract all TypeScript error lines
    grep -E "error TS[0-9]+:" "$TEMP_DIR/ci-errors.log" > "$TEMP_DIR/ts-errors.txt" || true
    
    # Also try alternate format
    grep -E "##\[error\].*\.ts" "$TEMP_DIR/ci-errors.log" >> "$TEMP_DIR/ts-errors.txt" || true
    
    # Remove duplicates
    sort -u "$TEMP_DIR/ts-errors.txt" -o "$TEMP_DIR/ts-errors-unique.txt"
}

# Function to categorize errors
categorize_errors() {
    echo -e "${BLUE}Categorizing errors...${NC}"
    
    # Create category files
    > "$TEMP_DIR/async-await-errors.txt"
    > "$TEMP_DIR/missing-module-errors.txt"
    > "$TEMP_DIR/property-errors.txt"
    > "$TEMP_DIR/type-mismatch-errors.txt"
    > "$TEMP_DIR/implicit-any-errors.txt"
    > "$TEMP_DIR/import-errors.txt"
    > "$TEMP_DIR/test-errors.txt"
    > "$TEMP_DIR/other-errors.txt"
    
    while IFS= read -r line; do
        # Categorize by error code and pattern
        if [[ $line =~ "TS2307" ]] || [[ $line =~ "Cannot find module" ]]; then
            echo "$line" >> "$TEMP_DIR/missing-module-errors.txt"
        elif [[ $line =~ "TS2339" ]] || [[ $line =~ "TS2576" ]] || [[ $line =~ "Property.*does not exist" ]]; then
            echo "$line" >> "$TEMP_DIR/property-errors.txt"
        elif [[ $line =~ "TS2322" ]] || [[ $line =~ "TS2345" ]] || [[ $line =~ "not assignable" ]]; then
            echo "$line" >> "$TEMP_DIR/type-mismatch-errors.txt"
        elif [[ $line =~ "TS7006" ]] || [[ $line =~ "TS7031" ]] || [[ $line =~ "implicitly has.*any" ]]; then
            echo "$line" >> "$TEMP_DIR/implicit-any-errors.txt"
        elif [[ $line =~ "__tests__" ]] || [[ $line =~ ".test.ts" ]]; then
            echo "$line" >> "$TEMP_DIR/test-errors.txt"
        elif [[ $line =~ "await" ]] || [[ $line =~ "Promise" ]] || [[ $line =~ "async" ]]; then
            echo "$line" >> "$TEMP_DIR/async-await-errors.txt"
        elif [[ $line =~ "import" ]] || [[ $line =~ "export" ]]; then
            echo "$line" >> "$TEMP_DIR/import-errors.txt"
        else
            echo "$line" >> "$TEMP_DIR/other-errors.txt"
        fi
    done < "$TEMP_DIR/ts-errors-unique.txt"
}

# Function to generate report
generate_report() {
    echo -e "\n${GREEN}TypeScript Error Report${NC}"
    echo "======================="
    
    # Count errors by category
    echo -e "\n${YELLOW}Error Categories:${NC}"
    
    for category in async-await missing-module property type-mismatch implicit-any import test other; do
        COUNT=$(wc -l < "$TEMP_DIR/${category}-errors.txt" 2>/dev/null || echo 0)
        printf "%-20s: %3d errors\n" "$category" "$COUNT"
    done
    
    # Total errors
    TOTAL=$(wc -l < "$TEMP_DIR/ts-errors-unique.txt" 2>/dev/null || echo 0)
    echo -e "\n${RED}Total Unique Errors: $TOTAL${NC}"
    
    # Most affected files
    echo -e "\n${YELLOW}Most Affected Files (Top 10):${NC}"
    grep -oE "[^/]+\.(ts|tsx):[0-9]+" "$TEMP_DIR/ts-errors-unique.txt" 2>/dev/null | \
        cut -d: -f1 | sort | uniq -c | sort -nr | head -10 || echo "No file data available"
    
    # Most common error codes
    echo -e "\n${YELLOW}Most Common Error Codes:${NC}"
    grep -oE "TS[0-9]+" "$TEMP_DIR/ts-errors-unique.txt" 2>/dev/null | \
        sort | uniq -c | sort -nr | head -10 || echo "No error code data available"
}

# Function to suggest fixes
suggest_fixes() {
    echo -e "\n${GREEN}Suggested SuperClaude Commands:${NC}"
    echo "==============================="
    
    # Check which categories have the most errors
    ASYNC_COUNT=$(wc -l < "$TEMP_DIR/async-await-errors.txt" 2>/dev/null || echo 0)
    MODULE_COUNT=$(wc -l < "$TEMP_DIR/missing-module-errors.txt" 2>/dev/null || echo 0)
    PROPERTY_COUNT=$(wc -l < "$TEMP_DIR/property-errors.txt" 2>/dev/null || echo 0)
    
    echo -e "\n${BLUE}Priority 1 - Highest Impact Fixes:${NC}"
    
    if [ "$ASYNC_COUNT" -gt 20 ]; then
        echo "/improve --code --refactor --strict --persona-backend \\"
        echo "  \"Fix all async/await Supabase client usage patterns\""
    fi
    
    if [ "$MODULE_COUNT" -gt 10 ]; then
        echo "/build --feature \"type-declarations\" \\"
        echo "  \"Create missing type declaration files\""
    fi
    
    if [ "$PROPERTY_COUNT" -gt 20 ]; then
        echo "/analyze --code --deep --seq \\"
        echo "  \"Analyze property access patterns and fix type definitions\""
    fi
    
    echo -e "\n${BLUE}Automated Fix Workflow:${NC}"
    echo "/chain:create \"fix-typescript\" --save"
    echo "/chain \"fix-typescript\" --monitor --parallel"
}

# Function to create detailed error files
create_error_files() {
    echo -e "\n${BLUE}Creating detailed error files...${NC}"
    
    # Create a markdown report
    cat > "$TEMP_DIR/typescript-error-report.md" << EOF
# TypeScript Error Analysis Report
Generated: $(date)

## Summary
Total Errors: $(wc -l < "$TEMP_DIR/ts-errors-unique.txt" 2>/dev/null || echo 0)

## Error Categories

### Async/Await Errors ($(wc -l < "$TEMP_DIR/async-await-errors.txt" 2>/dev/null || echo 0))
\`\`\`
$(head -5 "$TEMP_DIR/async-await-errors.txt" 2>/dev/null || echo "No errors")
\`\`\`

### Missing Module Errors ($(wc -l < "$TEMP_DIR/missing-module-errors.txt" 2>/dev/null || echo 0))
\`\`\`
$(head -5 "$TEMP_DIR/missing-module-errors.txt" 2>/dev/null || echo "No errors")
\`\`\`

### Property Access Errors ($(wc -l < "$TEMP_DIR/property-errors.txt" 2>/dev/null || echo 0))
\`\`\`
$(head -5 "$TEMP_DIR/property-errors.txt" 2>/dev/null || echo "No errors")
\`\`\`

### Type Mismatch Errors ($(wc -l < "$TEMP_DIR/type-mismatch-errors.txt" 2>/dev/null || echo 0))
\`\`\`
$(head -5 "$TEMP_DIR/type-mismatch-errors.txt" 2>/dev/null || echo "No errors")
\`\`\`
EOF
    
    echo "Detailed report saved to: $TEMP_DIR/typescript-error-report.md"
}

# Main execution
main() {
    echo "Starting TypeScript error analysis..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: Not in a Node.js project directory${NC}"
        echo "Please run this script from the hangjegyzet project root"
        exit 1
    fi
    
    # Option to use local build or CI logs
    if [ "$1" == "--local" ]; then
        echo "Running local TypeScript build..."
        npm run build 2>&1 | tee "$TEMP_DIR/ci-errors.log" || true
    else
        fetch_ci_logs || {
            echo "Falling back to local build..."
            npm run build 2>&1 | tee "$TEMP_DIR/ci-errors.log" || true
        }
    fi
    
    extract_ts_errors
    categorize_errors
    generate_report
    suggest_fixes
    create_error_files
    
    echo -e "\n${GREEN}Analysis complete!${NC}"
    echo "Detailed results saved in: $TEMP_DIR/"
    echo ""
    echo "To view the full report:"
    echo "  cat $TEMP_DIR/typescript-error-report.md"
    echo ""
    echo "To see specific error categories:"
    echo "  ls -la $TEMP_DIR/*-errors.txt"
}

# Run main function
main "$@"