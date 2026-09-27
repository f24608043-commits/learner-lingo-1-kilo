import { createCourse } from "./actions";

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">New Course</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in the details below. You can add units and lessons after saving.
        </p>
      </div>

      <form action={createCourse} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="title">
            Course Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="e.g. Python Programming"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="A brief description of what learners will achieve"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="coverUrl">
            Cover Image URL (optional)
          </label>
          <input
            id="coverUrl"
            name="coverUrl"
            type="url"
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Open Source Content Import Section */}
        <div className="border-t border-gray-200 pt-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Import from Open Source Content</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="youtubeUrl">
                YouTube Playlist URL
              </label>
              <input
                id="youtubeUrl"
                name="youtubeUrl"
                type="url"
                placeholder="https://www.youtube.com/playlist?list=..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Import videos from a YouTube playlist as lessons
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="youtubeVideoIds">
                YouTube Video IDs (comma-separated)
              </label>
              <input
                id="youtubeVideoIds"
                name="youtubeVideoIds"
                type="text"
                placeholder="dQw4w9WgXcQ, abc123def456"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Add specific YouTube videos as lessons
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isPublished"
            name="isPublished"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
            Publish immediately (visible to learners)
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
          <a
            href="/admin"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
          >
            Create Course →
          </button>
        </div>
      </form>
    </div>
  );
}
