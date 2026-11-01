import React, { useState } from 'react';
import { X, Plus, Trash2, DollarSign, Briefcase } from 'lucide-react';
import { api } from '../../api/client';

interface NewRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const NewRequisitionModal: React.FC<NewRequisitionModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [experienceLevel, setExperienceLevel] = useState('Senior');
  const [minSalary, setMinSalary] = useState<number>(140000);
  const [maxSalary, setMaxSalary] = useState<number>(190000);
  const [location, setLocation] = useState('Remote - US');
  const [openingsCount, setOpeningsCount] = useState<number>(1);
  const [skills, setSkills] = useState<{ skill_name: string; importance: 'REQUIRED' | 'PREFERRED'; min_years_experience: number }[]>([
    { skill_name: 'Python', importance: 'REQUIRED', min_years_experience: 4 },
    { skill_name: 'PostgreSQL', importance: 'REQUIRED', min_years_experience: 3 }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    setSkills([...skills, { skill_name: '', importance: 'REQUIRED', min_years_experience: 2 }]);
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleSkillChange = (index: number, field: string, value: any) => {
    const updated = [...skills];
    (updated[index] as any)[field] = value;
    setSkills(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (minSalary > maxSalary) {
      setError('Minimum salary cannot exceed maximum salary.');
      return;
    }

    setLoading(true);
    try {
      await api.createRequisition({
        title,
        department,
        hiring_manager_id: 'HM-000001',
        experience_level: experienceLevel,
        min_salary: Number(minSalary),
        max_salary: Number(maxSalary),
        currency: 'USD',
        location,
        status: 'OPEN',
        openings_count: Number(openingsCount),
        skills: skills.filter(s => s.skill_name.trim().length > 0)
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create requisition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh] space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Create Approved Job Requisition</h3>
            <p className="text-xs text-slate-500">Configure position, verified compensation bands, and skill criteria</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase">Requisition Title *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Backend Architect"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Department *</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Data & AI">Data & AI</option>
              <option value="Design">Design</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Customer Success">Customer Success</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Experience Level *</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Entry">Entry</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead</option>
              <option value="Executive">Executive</option>
            </select>
          </div>
        </div>

        {/* Approved Salary Bands */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            Approved Compensation Band (USD)
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500">Minimum Salary ($)</label>
              <input
                type="number"
                required
                min={30000}
                step={5000}
                value={minSalary}
                onChange={(e) => setMinSalary(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm mono-font focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500">Maximum Salary ($)</label>
              <input
                type="number"
                required
                min={30000}
                step={5000}
                value={maxSalary}
                onChange={(e) => setMaxSalary(Number(e.target.value))}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm mono-font focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Headcount Openings *</label>
            <input
              type="number"
              min={1}
              max={25}
              value={openingsCount}
              onChange={(e) => setOpeningsCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Location *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Required Skills Configuration */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase">Role Skills & Competencies</label>
            <button
              type="button"
              onClick={handleAddSkill}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Skill</span>
            </button>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {skills.map((sk, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. Python, React"
                  value={sk.skill_name}
                  onChange={(e) => handleSkillChange(idx, 'skill_name', e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
                <select
                  value={sk.importance}
                  onChange={(e) => handleSkillChange(idx, 'importance', e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="REQUIRED">Required</option>
                  <option value="PREFERRED">Preferred</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={sk.min_years_experience}
                  onChange={(e) => handleSkillChange(idx, 'min_years_experience', Number(e.target.value))}
                  className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                  title="Min Years Experience"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            {loading ? 'Creating...' : 'Create Requisition'}
          </button>
        </div>
      </form>
    </div>
  );
};
