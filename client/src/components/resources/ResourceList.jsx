import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ResourceCard from './ResourceCard';
import toast from 'react-hot-toast';

const ResourceList = ({ groupId, isCreator, refreshKey }) => {
    const { api } = useAuth();

    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchResources = async () => {
        try {
            const { data } = await api.get(`/groups/${groupId}/resources`);
            // Sort by newest first
            const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setResources(sorted);
        } catch (error) {
            console.error('Fetch resources error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResources();
    }, [groupId, refreshKey]);

    const handleDelete = async (resourceId) => {
        if (!window.confirm('Delete this resource?')) return;

        try {
            await api.delete(`/groups/${groupId}/resources/${resourceId}`);
            setResources((prev) => prev.filter((r) => r._id !== resourceId));
            toast.success('Resource deleted');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    if (loading) {
        return (
            <div className="grid-desktop">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="clay-card animate-pulse h-32" />
                ))}
            </div>
        );
    }

    if (resources.length === 0) {
        return (
            <div className="clay-card text-center py-12">
                <FolderOpen className="h-14 w-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    No resources yet
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Upload files to share with your study group
                </p>
            </div>
        );
    }

    const displayedResources = isExpanded ? resources : resources.slice(0, 3);

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Latest Attachments ({resources.length})
                </h3>
            </div>

            <div className="flex flex-col gap-2">
                {displayedResources.map((resource, index) => (
                    <motion.div
                        key={resource._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                    >
                        <ResourceCard
                            resource={resource}
                            isCreator={isCreator}
                            onDelete={handleDelete}
                        />
                    </motion.div>
                ))}
            </div>

            {resources.length > 3 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full mt-3 py-2 text-xs font-medium text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/10 dark:hover:bg-orange-900/20 rounded-xl transition-colors"
                >
                    {isExpanded ? 'Show less' : `Show all ${resources.length} attachments`}
                </button>
            )}
        </div>
    );
};

export default ResourceList;
