"use client";

import { useEffect } from "react";

/**
 * Chrome Translate wraps text nodes in <font>, so React's insertBefore/removeChild
 * throw NotFoundError on the next client navigation.
 */
export function ChromeTranslateGuard() {
  useEffect(() => {
    const removeChild = Node.prototype.removeChild;
    const insertBefore = Node.prototype.insertBefore;

    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) return child;
      return removeChild.call(this, child) as T;
    };

    Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) return newNode;
      return insertBefore.call(this, newNode, referenceNode) as T;
    };

    return () => {
      Node.prototype.removeChild = removeChild;
      Node.prototype.insertBefore = insertBefore;
    };
  }, []);

  return null;
}
