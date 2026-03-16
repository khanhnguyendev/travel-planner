'use client';

import { useState } from 'react';
import { Plus, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Place, Category, PlaceVote, PlaceReview, ProjectRole } from '@/lib/types';
import { CategoryList } from '@/components/categories/category-list';
import { AddCategoryForm } from '@/components/categories/add-category-form';
import { AddPlaceForm } from '@/components/places/add-place-form';
import { PlaceGrid } from '@/components/places/place-grid';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface PlacesSectionProps {
  projectId: string;
  role: ProjectRole;
  initialPlaces: Place[];
  initialCategories: Category[];
  initialVoteSummaries: VoteSummaryEntry[];
  initialUserVotes: PlaceVote[];
  reviewsByPlaceId: Record<string, PlaceReview[]>;
}

const canEdit = (role: ProjectRole) =>
  ['owner', 'admin', 'editor'].includes(role);

export function PlacesSection({
  projectId,
  role,
  initialPlaces,
  initialCategories,
  initialVoteSummaries,
  initialUserVotes,
  reviewsByPlaceId: initialReviewsByPlaceId,
}: PlacesSectionProps) {
  const [places, setPlaces] = useState<Place[]>(initialPlaces);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [voteSummaries] = useState<VoteSummaryEntry[]>(initialVoteSummaries);
  const [userVotes] = useState<PlaceVote[]>(initialUserVotes);
  const [reviewsByPlaceId, setReviewsByPlaceId] = useState<
    Record<string, PlaceReview[]>
  >(initialReviewsByPlaceId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);

  const editor = canEdit(role);

  function handleCategoryCreated(cat: Category) {
    setCategories((prev) => [...prev, cat]);
  }

  function handlePlaceAdded(place: Place, reviews: PlaceReview[]) {
    setPlaces((prev) => [place, ...prev]);
    if (reviews.length > 0) {
      setReviewsByPlaceId((prev) => ({ ...prev, [place.id]: reviews }));
    }
    setShowAddPlace(false);
  }

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
          Places
          {places.length > 0 && (
            <span
              className="ml-2 text-sm font-normal"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ({places.length})
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {editor && (
            <>
              <button
                onClick={() => setShowManageCategories((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors"
                style={{
                  backgroundColor: showManageCategories
                    ? 'var(--color-bg-muted)'
                    : 'var(--color-bg-subtle)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Settings2 className="w-4 h-4" />
                Categories
                {showManageCategories ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => setShowAddPlace((v) => !v)}
                className="btn-primary inline-flex items-center gap-1.5 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add place
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manage categories panel */}
      {showManageCategories && editor && (
        <div
          className="card p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Manage categories
          </h3>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    backgroundColor: cat.color ?? 'var(--color-bg-subtle)',
                    color: '#1C1917',
                  }}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          )}

          <AddCategoryForm
            projectId={projectId}
            onCreated={handleCategoryCreated}
          />
        </div>
      )}

      {/* Add place form */}
      {showAddPlace && editor && (
        <div
          className="card p-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Add a place
          </h3>
          <AddPlaceForm
            projectId={projectId}
            categories={categories}
            onAdded={handlePlaceAdded}
            onCancel={() => setShowAddPlace(false)}
          />
        </div>
      )}

      {/* Category filter */}
      {categories.length > 0 && (
        <CategoryList
          categories={categories}
          selectedId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />
      )}

      {/* Place grid */}
      <PlaceGrid
        places={places}
        categories={categories}
        projectId={projectId}
        selectedCategoryId={selectedCategoryId}
        voteSummaries={voteSummaries}
        userVotes={userVotes}
        reviewsByPlaceId={reviewsByPlaceId}
      />
    </div>
  );
}
