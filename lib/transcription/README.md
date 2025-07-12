# Enhanced Transcription System

This directory contains the enhanced transcription system for Hangjegyzet, featuring state-of-the-art audio processing, multi-pass transcription, vocabulary enhancement, and accuracy monitoring.

## Features

### 1. Audio Preprocessing (`audio-preprocessor.ts`)
- **Noise Reduction**: Removes background noise using FFmpeg's advanced filters
- **Volume Normalization**: Ensures consistent audio levels using loudness normalization
- **Voice Activity Detection (VAD)**: Identifies speech segments for optimized processing
- **Audio Quality Assessment**: Analyzes SNR, peak levels, and overall quality
- **Enhancement for Poor Audio**: Applies aggressive processing for low-quality recordings

### 2. Multi-Pass Transcription (`multi-pass-transcriber.ts`)
- **Multiple Temperature Passes**: Runs Whisper with different temperatures for better accuracy
- **Result Merging**: Intelligently combines results from multiple passes
- **Claude Opus Enhancement**: Uses Claude's most powerful model for post-processing
- **Speaker Diarization**: Identifies different speakers in the conversation
- **Confidence Scoring**: Calculates reliability scores for transcription segments

### 3. Vocabulary Enhancement (`vocabulary-enhanced.ts`)
- **Organization-Specific Terms**: Loads custom vocabulary per organization
- **Real-Time Learning**: Updates vocabulary confidence based on usage
- **Phonetic Matching**: Handles Hungarian pronunciation variations
- **Context-Aware Replacement**: Only replaces terms when context matches
- **Import/Export**: Supports CSV import and shared vocabulary libraries

### 4. Accuracy Monitoring (`accuracy-monitor.ts`)
- **Metrics Tracking**: Records WER, CER, confidence scores, and quality metrics
- **User Feedback Loop**: Learns from user corrections to improve future transcriptions
- **Performance Reports**: Generates detailed accuracy reports with recommendations
- **Error Pattern Detection**: Identifies and learns from repeated mistakes
- **Vocabulary Performance**: Tracks which terms are well/poorly recognized

### 5. Enhanced Processor (`enhanced-processor.ts`)
- **Unified Pipeline**: Combines all enhancement features in a single workflow
- **Configurable Options**: Fine-tune every aspect of the transcription process
- **Progress Tracking**: Real-time updates on processing status
- **Cost Optimization**: Automatically adjusts processing based on audio quality
- **Error Recovery**: Graceful fallbacks and retry mechanisms

## Usage

### Basic Usage

```typescript
import { enhancedProcessor } from '@/lib/transcription/enhanced-processor'

const result = await enhancedProcessor.process({
  organizationId: 'org-123',
  meetingId: 'meeting-456',
  fileUrl: 'https://example.com/audio.mp3',
  userId: 'user-789',
  language: 'hu'
})
```

### Advanced Configuration

```typescript
const result = await enhancedProcessor.process({
  // Required
  organizationId: 'org-123',
  meetingId: 'meeting-456',
  fileUrl: 'https://example.com/audio.mp3',
  userId: 'user-789',
  
  // Processing options
  enablePreprocessing: true,
  enableMultiPass: true,
  enableVocabularyEnhancement: true,
  enableAccuracyMonitoring: true,
  enableParallelProcessing: true,
  
  // Advanced settings
  multiPassCount: 3,
  temperatures: [0.0, 0.1, 0.2],
  speakerCount: 2,
  customVocabulary: ['specifikus', 'terminus'],
  contextHints: ['pénzügyi megbeszélés', 'Q4 eredmények'],
  
  // Quality thresholds
  minAudioQuality: 'fair',
  minConfidenceScore: 0.8
})
```

### Processing Feedback

```typescript
await enhancedProcessor.processFeedback(meetingId, [
  {
    originalText: 'incorrect term',
    correctedText: 'correct term',
    startTime: 10.5,
    endTime: 12.0
  }
], userId)
```

## Configuration

Edit `config.ts` to adjust system-wide settings:

```typescript
import { TranscriptionConfig } from '@/lib/transcription/config'

// Adjust noise reduction strength
TranscriptionConfig.preprocessing.noiseReduction.strength = -30

// Change number of default passes
TranscriptionConfig.multiPass.defaultPasses = 3

// Disable Claude enhancement
TranscriptionConfig.claude.enabled = false
```

## Architecture

```
Enhanced Transcription Pipeline
│
├── Audio Input
│   ├── Download from Supabase
│   └── Buffer preparation
│
├── Preprocessing Stage
│   ├── Noise reduction
│   ├── Normalization
│   ├── VAD analysis
│   └── Quality assessment
│
├── Transcription Stage
│   ├── Multi-pass with Whisper
│   ├── Parallel chunk processing
│   └── Result merging
│
├── Enhancement Stage
│   ├── Vocabulary matching
│   ├── Claude post-processing
│   └── Speaker diarization
│
├── Monitoring Stage
│   ├── Accuracy metrics
│   ├── Usage tracking
│   └── Feedback processing
│
└── Output
    ├── Final transcript
    ├── Timestamped segments
    └── Quality metadata
```

## Performance Considerations

### Audio Preprocessing
- FFmpeg commands are CPU-intensive
- Consider using a worker thread for large files
- Cache processed audio for repeated transcriptions

### Multi-Pass Transcription
- Each pass costs OpenAI API credits
- Balance accuracy vs. cost with pass count
- Use confidence thresholds to skip unnecessary passes

### Claude Enhancement
- Most expensive but highest quality
- Reserve for important meetings or poor audio
- Batch corrections to reduce API calls

### Parallel Processing
- Significantly faster for long recordings
- Requires more memory and API concurrency
- Automatic fallback to sequential on failure

## Monitoring and Analytics

### Accuracy Metrics
- **WER (Word Error Rate)**: Percentage of words that need correction
- **CER (Character Error Rate)**: Percentage of characters that need correction
- **Confidence Score**: 0-1 score indicating transcription reliability
- **Audio Quality**: Poor/Fair/Good/Excellent rating

### Performance Metrics
- **Processing Time**: Total time to complete transcription
- **Speed Factor**: Processing time vs. audio duration ratio
- **Enhancement Impact**: Improvement from each enhancement stage
- **Cost per Minute**: Total API costs divided by audio duration

### Learning Metrics
- **Vocabulary Growth**: New terms learned over time
- **Error Patterns**: Common mistakes and their corrections
- **User Satisfaction**: Based on correction frequency
- **Model Performance**: Accuracy trends over time

## Best Practices

1. **Audio Quality**
   - Encourage users to record in quiet environments
   - Use external microphones when possible
   - Check audio quality before long recordings

2. **Vocabulary Management**
   - Regularly review and update organization vocabulary
   - Export successful terms for sharing
   - Remove outdated or incorrect terms

3. **Cost Optimization**
   - Use single-pass for high-quality audio
   - Disable Claude for routine meetings
   - Batch process during off-peak hours

4. **Accuracy Improvement**
   - Encourage users to provide corrections
   - Review accuracy reports monthly
   - Update vocabulary based on common errors

## Troubleshooting

### Common Issues

1. **"FFmpeg command failed"**
   - Ensure FFmpeg is installed on the server
   - Check file permissions and paths
   - Verify audio file format is supported

2. **"Transcription timeout"**
   - Increase timeout in config.ts
   - Use parallel processing for long files
   - Check API rate limits

3. **"Low confidence scores"**
   - Improve audio quality
   - Add relevant vocabulary terms
   - Increase number of passes

4. **"Vocabulary not matching"**
   - Check phonetic hints
   - Verify context hints are relevant
   - Review confidence scores

## Future Enhancements

- [ ] Real-time transcription with streaming
- [ ] Advanced speaker diarization with voice profiles
- [ ] Multi-language support with auto-detection
- [ ] Custom acoustic models for specific industries
- [ ] Integration with video transcription
- [ ] Automated summary generation
- [ ] Sentiment analysis for meeting insights
- [ ] Export to subtitle formats (SRT, VTT)