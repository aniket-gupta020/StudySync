import { motion } from 'framer-motion';
import { Users, Clock } from 'lucide-react';

const GroupCard = ({ group, onClick }) => {
    const memberCount = group.members?.length || 0;
    const creatorName = group.createdBy?.name || 'Unknown';
    const createdDate = new Date(group.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="glass-card cursor-pointer hover:shadow-lg transition-all duration-300 group"
        >
            {/* Gradient accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full mb-4" />

            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                {group.name}
            </h3>

            {group.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {group.description}
                </p>
            )}

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                    <Users className="h-4 w-4" />
                    <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{createdDate}</span>
                </div>
            </div>

            {/* Creator badge */}
            <div className="mt-3">
                <span className="text-xs px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium">
                    by {creatorName}
                </span>
            </div>
        </motion.div>
    );
};

export default GroupCard;
