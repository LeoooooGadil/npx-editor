"use client";

import React, { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Toolbar } from "@/components/toolbar";
import { Cover } from "@/components/cover";
import dynamic from "next/dynamic";
import { useDexie } from "@/components/providers/dexie-provider";
import { useLiveQuery } from "dexie-react-hooks";

const BlogsPageEditor = () => {
  const params = useParams();
  const { blogId } = params;
  const blog = useLiveQuery(async () => {
    return await db.blogs
      .where("blogId")
      .equals(blogId as string)
      .first();
  }, [blogId]);

  const Editor = useMemo(
    () => dynamic(() => import("@/components/editor"), { ssr: false }),
    []
  );

  const { actions, db } = useDexie();

  const onChange = useMemo(() => {
    return (value: string) => {
      actions.blog.update(blog?.blogId as string, {
        content: value,
      });
    };
  }, [blog]);

  if (blog === undefined) {
    return <div></div>;
  }

  if (blog === null || blog === undefined) {
    return <div>Not found</div>;
  }

  return (
    <div className="">
      <Cover preview={blog?.isPreview === 1} />
      <div className="mx-auto max-w-md lg:max-w-6xl md:max-w-4xl md:px-24">
        <Toolbar initialData={blog} preview={blog?.isPreview === 1} />
        <Editor
          editable={blog?.isPreview !== 1}
          onChange={onChange}
          initialContent={blog?.content ?? ""}
        />
      </div>
    </div>
  );
};

export default BlogsPageEditor;
