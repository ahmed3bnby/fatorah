// invoice-service.js

const InvoiceService = {
    // Get the next sequential ID
    async getNextSequenceID(prefix = 'INV', padLength = 4) {
        try {
            const counterRef = db.collection('counters').doc('invoice_counter');
            let nextNum = 1001; // Starting number
            
            await db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                if (counterDoc.exists) {
                    nextNum = counterDoc.data().lastValue + 1;
                }
                transaction.set(counterRef, { lastValue: nextNum });
            });
            
            const padded = nextNum.toString().padStart(padLength, '0');
            return `${prefix}-${padded}`;
        } catch (error) {
            console.error("Error getting sequence ID: ", error);
            // Fallback to random if transaction fails (better than nothing)
            return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
        }
    },

    // Save or update an invoice
    async saveInvoice(invoiceData) {
        try {
            const userId = auth.currentUser ? auth.currentUser.uid : 'anonymous';
            
            // Add user metadata
            invoiceData.userId = userId;
            invoiceData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('invoices').doc(invoiceData.id).set(invoiceData, { merge: true });
            return true;
        } catch (error) {
            console.error("Error saving invoice: ", error);
            throw error;
        }
    },

    // Get a specific invoice by ID
    async getInvoice(invoiceId) {
        try {
            const doc = await db.collection('invoices').doc(invoiceId).get();
            if (doc.exists) {
                return doc.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error getting invoice: ", error);
            throw error;
        }
    },

    // Search invoices by Invoice ID or Student Name with Pagination
    async searchInvoicesPaged(searchQuery, pageSize = 10, lastVisible = null) {
        try {
            let queryRef = db.collection('invoices').orderBy('updatedAt', 'desc');
            
            // If there's a search query, Firestore's filtering is limited for partial matches,
            // so for a 'smart' search with pagination and partial strings, we'll fetch a larger chunk 
            // and filter in memory, but we'll try to keep it efficient.
            
            if (lastVisible) {
                queryRef = queryRef.startAfter(lastVisible);
            }
            
            const snapshot = await queryRef.limit(pageSize).get();
            let results = [];
            
            snapshot.forEach(doc => {
                results.push({
                    id_doc: doc.id, // reference for delete/load
                    ...doc.data(),
                    _snapshot: doc // meta for paging
                });
            });
            
            // If we have a search query, filter the results locally
            if (searchQuery) {
                const term = searchQuery.toLowerCase();
                results = results.filter(data => 
                    (data.id && data.id.toLowerCase().includes(term)) || 
                    (data.studentName && data.studentName.toLowerCase().includes(term))
                );
            }
            
            return {
                data: results,
                lastDoc: snapshot.docs[snapshot.docs.length - 1]
            };
        } catch (error) {
            console.error("Error searching paged invoices: ", error);
            throw error;
        }
    },

    // Delete an invoice
    async deleteInvoice(invoiceId) {
        try {
            await db.collection('invoices').doc(invoiceId).delete();
            return true;
        } catch (error) {
            console.error("Error deleting invoice: ", error);
            throw error;
        }
    }
};
