export interface Reward {
    type: string;
    amount: number;
}

export interface Task {
    name: string;
    progress: number;
}

export interface Author {
    name: string;
    avatarUrl: string;
}

export interface FeaturedCarouselItem {
    id: string;
    backgroundImageUrl: string;
    category: string;
    estimatedReadTimeMinutes: number;
    title: string;
    reward: Reward;
    author: Author;
}

export interface FeedItem {
    id: string;
    title: string;
    summary: string;
    thumbnailUrl: string;
    levelRequirement: string;
    estimatedReadTimeMinutes: number;
    reward: Reward;
    category: string;
    author: Author;
}

export interface ContentTab {
    id: string;
    title: string;
    feed: FeedItem[];
}

export interface ContentSection {
    tabs: ContentTab[];
}

export interface Ad {
    id: string;
    title: string;
    company: string;
}

export interface DashboardData {
    tasks: Task[];
    featuredCarousel: FeaturedCarouselItem[];
    contentSection: ContentSection;
    ads: Ad[];
}