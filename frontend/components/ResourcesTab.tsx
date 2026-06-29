import React from 'react';
import { Link as LinkIcon, FileText, PlayCircle, Code2, Download, BookOpen } from 'lucide-react';

interface Resource {
  title: string;
  type: 'link' | 'pdf' | 'video' | 'code' | 'download' | 'github' | 'documentation';
  url: string;
}

interface ResourcesTabProps {
  resources: Resource[];
}

const iconMap: Record<Resource['type'], React.JSX.Element> = {
  link: <LinkIcon size={20} />,
  pdf: <FileText size={20} />,
  video: <PlayCircle size={20} />,
  code: <Code2 size={20} />,
  download: <Download size={20} />,
  github: <Code2 size={20} />, // using Code2 for GitHub
  documentation: <BookOpen size={20} />, // requires BookOpen icon, fallback to LinkIcon if unavailable
};

export const ResourcesTab: React.FC<ResourcesTabProps> = ({ resources }) => {
  if (!resources || resources.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-lg font-medium">No additional resources for this lesson.</p>
        <p className="mt-2">Check back later for curated links, documents, and tutorials.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Lesson Resources</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((res, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center mb-2">
              <div className="mr-2 text-indigo-600">{iconMap[res.type] || <LinkIcon size={20} />}</div>
              <h3 className="text-md font-medium text-gray-800 truncate" title={res.title}>
                {res.title}
              </h3>
            </div>
            <div className="mt-2 flex space-x-2">
              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center bg-indigo-600 text-white text-sm px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
              >
                Open
              </a>
              {(res.type === 'pdf' || res.type === 'download' || res.type === 'code' || res.type === 'github') && (
                <a
                  href={res.url}
                  download
                  className="flex-1 text-center bg-gray-200 text-gray-800 text-sm px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

