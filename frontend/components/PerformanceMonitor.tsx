import React, { useEffect } from 'react';

// Lightweight frontend performance observer to log core metrics
export const PerformanceMonitor: React.FC = () => {
    useEffect(() => {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
            });
        });

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'] });

        // Log total requests after load
        window.addEventListener('load', () => {
            const requests = performance.getEntriesByType('resource');
            
            // Log top 5 largest requests
            const largest = requests
                .sort((a, b) => (b as PerformanceResourceTiming).transferSize - (a as PerformanceResourceTiming).transferSize)
                .slice(0, 5);
        });

        return () => observer.disconnect();
    }, []);

    return null;
};

