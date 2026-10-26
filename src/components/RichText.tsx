import Markdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

export function RichText({ text }: { text: string }) {
  return (
    <div className="ollie-md">
      <Markdown remarkPlugins={[remarkBreaks]}>{text}</Markdown>
    </div>
  )
}

export function plainSpeech(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
