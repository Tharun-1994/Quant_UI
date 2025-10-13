// UploadTab.tsx
const UploadTab: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4">Upload Files</h2>
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tradelist File</label>
        <input type="file" className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Equity File</label>
        <input type="file" className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
      </div>
      <button type="submit" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Upload</button>
    </form>
  </div>
);
export default UploadTab;
