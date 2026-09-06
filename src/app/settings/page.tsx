import { redirect } from 'next/navigation';

// Keep old bookmarks usable after retiring personal API connection settings.
export default function SettingsPage() {
    redirect('/help');
}
