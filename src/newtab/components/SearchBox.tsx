import { useState, KeyboardEvent } from 'react'
import { Search } from 'lucide-react'

interface SearchBoxProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBox({ onSearch, placeholder = "搜索..." }: SearchBoxProps) {
  const [query, setQuery] = useState('')

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(query)
    }
  }

  const handleSubmit = () => {
    onSearch(query)
  }

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <Search className="absolute left-4 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-4 text-lg bg-white bg-opacity-90 backdrop-blur-sm rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 placeholder-gray-500"
        />
        {query && (
          <button
            onClick={handleSubmit}
            className="absolute right-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            搜索
          </button>
        )}
      </div>
    </div>
  )
} 