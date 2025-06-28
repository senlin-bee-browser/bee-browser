import { useState, KeyboardEvent } from 'react'
import { Search, ArrowRight } from 'lucide-react'

interface SearchBoxProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBox({ onSearch, placeholder = "搜索..." }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(query)
    }
  }

  const handleSubmit = () => {
    onSearch(query)
  }

  return (
    <div className="relative w-full">
      <div className={`relative flex items-center transition-all duration-300 ${
        isFocused ? 'transform scale-105' : ''
      }`}>
        <div className="absolute left-5 z-10">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus
          placeholder={placeholder}
          className={`w-full pl-14 pr-20 py-4 text-lg bg-white/80 backdrop-blur-xl rounded-2xl border transition-all duration-300 placeholder-gray-600 text-gray-900 shadow-lg ${
            isFocused 
              ? 'border-blue-500 bg-white/90 shadow-xl ring-4 ring-blue-500/20' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-white/85'
          }`}
        />
        
        {query && (
          <button
            onClick={handleSubmit}
            className="absolute right-3 flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
} 