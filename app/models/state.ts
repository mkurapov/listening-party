import { Schema, model, Document, Model } from "mongoose";

interface StateObject {
  id: string;
  parties: object[];
}

interface StateDocument extends Omit<StateObject, "id">, Document {}

const stateSchema = new Schema(
  {
    parties: Array,
  },
  { timestamps: true }
);

const State = model<StateDocument, Model<StateDocument>>("State", stateSchema);

export { State, StateObject };
