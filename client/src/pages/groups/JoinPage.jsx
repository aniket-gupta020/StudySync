import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingPage from '../../components/LoadingPage';

const JoinPage = () => {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const { api } = useAuth();
    const [status, setStatus] = useState('joining'); // joining, error

    useEffect(() => {
        const joinGroup = async () => {
            try {
                // Determine API endpoint based on your backend routes
                // Assuming standard POST /groups/join/:code
                await api.post(`/groups/join/${inviteCode}`);

                toast.success('Successfully joined group!');
                // We don't have the group ID easily unless the API returns it. 
                // Let's assume the API returns the group object with _id
                // If not, we might redirect to dashboard.
                // Looking at previous code, logic returns updatedGroup.

                // For safety, let's Redirect to dashboard (or groups list) 
                // as finding the ID might require parsing the response carefully 
                // and if the user is already a member, the API might return error or group.

                navigate('/groups');
            } catch (error) {
                console.error('Join error:', error);
                const msg = error.response?.data?.message || 'Failed to join group';

                // If already member, treating as success-ish navigation
                if (msg.includes('already a member')) {
                    toast.success('You are already a member!');
                    navigate('/groups');
                    return;
                }

                toast.error(msg);
                setStatus('error');
                // Optional: Redirect after delay or let user click button
                setTimeout(() => navigate('/dashboard'), 3000);
            }
        };

        if (inviteCode) {
            joinGroup();
        }
    }, [inviteCode, api, navigate]);

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="clay-card p-8 max-w-md"
                >
                    <h2 className="text-2xl font-bold text-red-500 mb-4">Join Failed</h2>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                        The invite link may be invalid or expired.
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="clay-button w-full"
                    >
                        Go to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <LoadingPage />
            <p className="mt-4 text-slate-500 animate-pulse">
                Joining group...
            </p>
        </div>
    );
};

export default JoinPage;
