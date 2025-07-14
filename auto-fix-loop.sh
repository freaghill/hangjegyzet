#!/bin/bash

echo "🔄 Starting automated fix loop..."

iteration=1
max_iterations=10

while [ $iteration -le $max_iterations ]; do
    echo -e "\n📌 Iteration $iteration/$max_iterations"
    
    # Wait for build to complete
    echo "⏳ Waiting for build to complete..."
    sleep 240
    
    # Get latest deployment
    deployment=$(vercel ls 2>&1 | grep -E "https://hangjegyzet-.*vercel.app" | head -1)
    status=$(echo "$deployment" | awk '{print $3}')
    url=$(echo "$deployment" | awk '{print $2}')
    
    echo "Latest: $url - Status: $status"
    
    if [[ "$status" == "Ready" ]]; then
        echo "✅ BUILD SUCCESSFUL!"
        echo "🎉 Deployment URL: $url"
        break
    elif [[ "$status" == "●" ]] || [[ "$status" == "Building" ]]; then
        echo "Still building, waiting more..."
        sleep 120
        continue
    else
        echo "❌ Build failed, extracting error..."
        
        # Get the error
        error=$(vercel inspect --logs "$url" 2>&1 | grep -A 10 "Failed to compile" | head -20)
        
        if [[ -z "$error" ]]; then
            echo "No compilation error found. Build may have succeeded or failed for other reasons."
            vercel inspect --logs "$url" 2>&1 | tail -50
            break
        fi
        
        echo "$error"
        echo -e "\n🤖 Error detected in iteration $iteration"
        echo "Please fix the error and I'll continue monitoring..."
        break
    fi
    
    ((iteration++))
done

echo "🏁 Monitoring completed after $iteration iterations"