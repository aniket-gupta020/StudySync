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

    const fetchResources = async () => {
        try {
            const { data } = await api.get(`/groups/${groupId}/resources`);
            setResources(data);
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

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Shared Resources ({resources.length})
                </h3>
            </div>

            <div className="grid-desktop">
                {resources.map((resource, index) => (
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
        </div>
    );
};

export default ResourceList;
