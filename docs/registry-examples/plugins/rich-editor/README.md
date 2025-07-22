# Rich Editor Plugin

A feature-rich text editor built with TipTap for Supajump applications.

## Features

- **Rich Text Formatting**: Bold, italic, headings, lists, etc.
- **@Mentions**: Tag users within content
- **AI Assistance**: Writing suggestions and improvements (requires OpenAI API key)
- **Bubble Menu**: Context-aware formatting options
- **Placeholder Text**: Customizable placeholder
- **Markdown Support**: Write in markdown, render as rich text

## Installation

```bash
supajump plugins add rich-editor
```

This will automatically install the required shadcn/ui components:
- button
- dropdown-menu
- separator
- tooltip
- popover

## Usage

```tsx
import { RichEditor } from "@/features/rich-editor"

export function PostEditor() {
  const [content, setContent] = useState("")
  
  return (
    <RichEditor
      content={content}
      onChange={setContent}
      placeholder="Write your post..."
      showToolbar={true}
      showBubbleMenu={true}
    />
  )
}
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` (optional): Enable AI writing assistance features

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| content | string | "" | Initial editor content |
| onChange | (content: string) => void | - | Content change handler |
| placeholder | string | "Start writing..." | Placeholder text |
| className | string | - | Additional CSS classes |
| editable | boolean | true | Enable/disable editing |
| showToolbar | boolean | true | Show toolbar |
| showBubbleMenu | boolean | true | Show bubble menu |
| onMention | (mention) => void | - | Mention selection handler |

## Database Schema

This plugin adds the following columns to your posts table:

- `rich_content` (JSONB): Stores the TipTap JSON content
- `mentions` (JSONB): Array of mentioned user IDs

## Customization

### Adding Custom Extensions

```tsx
import { RichEditor } from "@/features/rich-editor"
import { CustomExtension } from "./my-extension"

// In your component
const editor = useEditor({
  extensions: [
    ...defaultExtensions,
    CustomExtension,
  ],
})
```

### Styling

The editor uses these CSS classes that you can customize:

- `.rich-editor`: Main container
- `.editor-toolbar`: Toolbar container
- `.editor-content`: Content area
- `.mention`: Mention elements
- `.bubble-menu`: Bubble menu container

## API Integration

The plugin includes queries for saving and loading content:

```typescript
import { api } from "@/queries"

// Save content
await api.richEditor.saveContent(postId, content, mentions)

// Load content
const { content, mentions } = await api.richEditor.getContent(postId)
```