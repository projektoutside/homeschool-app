import type { ContentItem } from '../../types/content';

export const scienceContent: ContentItem[] = [
  {
    id: 'sci-solar-system',
    title: 'Solar System Model',
    description: 'Interactive 3D model of the solar system.',
    type: 'tool',
    category: 'science',
    subjects: ['Astronomy'],
    gradeLevels: ['3rd', '4th', '5th'],
    externalUrl: 'https://eyes.nasa.gov/apps/solar-system',
    thumbnail: '/assets/thumbnails/solar-system.jpg',
    isFeatured: true,
    dateAdded: '2023-09-20'
  },
  {
    id: 'sci-introduction-to-graphs',
    title: 'Introduction to Graphs',
    description: 'Learn how to read, create, and interpret graphs and charts.',
    type: 'tool',
    category: 'science',
    subjects: ['Data Analysis', 'Mathematics'],
    gradeLevels: ['All'],
    customHtmlPath: '/FinalGraph/index.html',
    thumbnail: '/FinalGraph/thumb.png',
    dateAdded: '2026-01-24'
  }
];
