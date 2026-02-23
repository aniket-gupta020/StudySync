import Group from '../models/Group.js';

/**
 * Middleware to verify the authenticated user is a member of the group
 * specified by req.params.groupId. Must be used AFTER the `protect` middleware.
 */
export const groupMember = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        if (!groupId) {
            return res.status(400).json({ message: 'Group ID is required' });
        }

        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if the authenticated user is a member
        const isMember = group.members.some(
            (memberId) => memberId.toString() === req.user._id.toString()
        );

        if (!isMember) {
            return res.status(403).json({
                message: 'Access denied. You are not a member of this group.',
            });
        }

        // Attach group to request for downstream use
        req.group = group;
        next();
    } catch (error) {
        console.error('Group member middleware error:', error);
        res.status(500).json({ message: 'Server error checking group membership' });
    }
};
