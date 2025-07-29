import React from 'react';
import type { ArticleWithAuthor } from './src/types/convex';
import { useCreateUserMutation, useGetAllArticles } from './src/types/convexQueries';

// Example component using the generated hooks
export const ArticleList: React.FC = () => {
  // Use the auto-generated hook instead of manual useQuery
  const articles = useGetAllArticles();
  const createUser = useCreateUserMutation();

  if (articles === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Articles</h1>
      {articles.map((article: ArticleWithAuthor) => (
        <div key={article._id}>
          <h2>{article.title}</h2>
          {article.author && (
            <p>By {article.author.name}</p>
          )}
        </div>
      ))}
    </div>
  );
};

// Before (manual approach):
// import { useQuery } from 'convex/react';
// import { api } from 'convex/_generated/api';
// const articles = useQuery(api.articles.getAll.default);

// After (auto-generated):
// import { useGetAllArticles } from './src/types/convexQueries';
// const articles = useGetAllArticles(); 