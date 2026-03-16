'use client';

import { useState } from 'react';
import { Plus, Settings2, ChevronDown, ChevronUp, Tag } from 'lucide-react';
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
        <h2 className="text-lg font-semibold text-stone-800">
          Places
          {places.length > 0 && (
            <span className="ml-2 text-sm font-normal text-stone-400">
              ({places.length})
            </span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {editor && (
            <>
              <button
                onClick={() => setShowManageCategories((v) => !v)}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl transition-colors min-h-[44px]"
                style={{
                  backgroundColor: showManageCategories
                    ? 'var(--color-bg-muted)'
                    : 'var(--color-bg-subtle)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Categories</span>
                {showManageCategories ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                onClick={() => setShowAddPlace((v) => !v)}
                className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
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
          <h3 className="text-sm font-semibold mb-4 text-stone-800">
            Manage categories
          </h3>

          {categories.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: 'var(--color-primary-light)' }}
              >
                <Tag className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              </div>
              <p className="text-sm font-medium text-stone-800 mb-1">
                Create a category to organize places
              </p>
              <p className="text-xs text-stone-400 mb-4">
                Categories help group places by type like restaurants, hotels, or attractions.
              </p>
            </div>
          ) : (
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
          <h3 className="text-sm font-semibold mb-4 text-stone-800">
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
        onAddPlace={editor ? () => setShowAddPlace(true) : undefined}
      />
    </div>
  );
}
