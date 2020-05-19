import mongoose from 'mongoose'

const stateSchema = new mongoose.Schema({
    numUsers: Number,
    numParties: Number
}, { timestamps: true });

const StateModel = mongoose.model('State', stateSchema);

export * from 'mongoose';
export { StateModel };
