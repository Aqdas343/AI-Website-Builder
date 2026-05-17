import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    snapshot: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Version = mongoose.model('Version', versionSchema);

export default Version;
