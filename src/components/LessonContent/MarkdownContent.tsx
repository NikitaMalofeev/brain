import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  return (
    <div className={`text-[#242424] leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-5 mb-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
          p: ({ node, children, ...props }) => {
            // Преобразуем текст с URL в кликабельные ссылки
            const processChildren = (children: any): any => {
              if (typeof children === 'string') {
                // Регулярное выражение для поиска URL
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const parts = children.split(urlRegex);
                
                return parts.map((part, index) => {
                  if (part.match(urlRegex)) {
                    return (
                      <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B862EA] underline hover:no-underline"
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                });
              }
              
              // Если children - это массив или другой элемент, обрабатываем рекурсивно
              if (Array.isArray(children)) {
                return children.map((child, index) => {
                  if (typeof child === 'string') {
                    return processChildren(child);
                  }
                  return child;
                });
              }
              
              return children;
            };
            
            return <p className="my-3" {...props}>{processChildren(children)}</p>;
          },
          ul: ({ node, ...props }) => <ul className="list-disc list-inside my-3 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside my-3 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="ml-2" {...props} />,
          code: ({ node, inline, ...props }) => 
            inline ? (
              <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props} />
            ) : (
              <code className="block bg-gray-100 p-4 rounded-lg overflow-x-auto my-3" {...props} />
            ),
          pre: ({ node, ...props }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-3" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-4 text-gray-600 italic" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-[#B862EA] underline hover:no-underline" {...props} target="_blank" rel="noopener noreferrer" />
          ),
          hr: ({ node, ...props }) => <hr className="border-t border-gray-300 my-8" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          img: ({ node, ...props }) => <img className="max-w-full h-auto my-4 rounded-lg" {...props} />,
          table: ({ node, ...props }) => <table className="w-full border-collapse my-4" {...props} />,
          th: ({ node, ...props }) => <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left" {...props} />,
          td: ({ node, ...props }) => <td className="border border-gray-300 px-4 py-2" {...props} />,
        }}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
};