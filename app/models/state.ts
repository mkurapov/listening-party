import { Schema, model, Document, Model } from "mongoose";

interface StateObject {
  id: string;
  numUsers: number;
  numParties: number;
  parties: object[];
}

interface StateDocument extends Omit<StateObject, "id">, Document {}

const stateSchema = new Schema(
  {
    numUsers: Number,
    numParties: Number,
    parties: Array,
  },
  { timestamps: true }
);

const State = model<StateDocument, Model<StateDocument>>("State", stateSchema);

export { State, StateObject };
