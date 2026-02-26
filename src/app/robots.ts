import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/api/', '/arena/', '/result/', '/participants/'],
            },
        ],
        sitemap: 'https://letsdebate.app/sitemap.xml',
    };
}
