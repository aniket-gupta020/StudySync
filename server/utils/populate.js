import Student from '../models/Student.js';
import Tutor from '../models/Tutor.js';

/**
 * Manually populates user fields from Student and Tutor collections.
 * @param {Array|Object} docs - Mongoose document(s) or POJO(s)
 * @param {Array} fields - Array of field names to populate (e.g., ['createdBy', 'members'])
 * @returns {Array|Object} - Populated documents
 */
export const populateUsers = async (docs, fields) => {
    if (!docs) return docs;
    const isArray = Array.isArray(docs);
    let documents = isArray ? docs : [docs];

    // Ensure they are POJOs
    documents = documents.map(doc => (doc.toObject ? doc.toObject() : doc));

    const userIds = new Set();

    // Collect all IDs from specified fields
    documents.forEach(doc => {
        fields.forEach(field => {
            const val = doc[field];
            if (Array.isArray(val)) {
                val.forEach(id => {
                    if (id) userIds.add(String(id));
                });
            } else if (val) {
                userIds.add(String(val));
            }
        });
    });

    const ids = Array.from(userIds);
    if (ids.length === 0) return isArray ? documents : documents[0];

    // Fetch users from both collections
    const [students, tutors] = await Promise.all([
        Student.find({ _id: { $in: ids } }).select('name email role'),
        Tutor.find({ _id: { $in: ids } }).select('name email role')
    ]);

    // Create Map
    const userMap = {};
    students.forEach(u => userMap[String(u._id)] = u);
    tutors.forEach(u => userMap[String(u._id)] = u);

    // Replace IDs with User objects
    documents.forEach(doc => {
        fields.forEach(field => {
            const val = doc[field];
            if (Array.isArray(val)) {
                doc[field] = val.map(id => userMap[String(id)]).filter(u => u);
            } else if (val) {
                doc[field] = userMap[String(val)] || null;
            }
        });
    });

    return isArray ? documents : documents[0];
};
