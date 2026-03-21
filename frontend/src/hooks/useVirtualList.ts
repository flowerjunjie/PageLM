/**
 * Virtual List Hook
 * 虚拟列表 hook，用于高效渲染大列表
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================
// 类型定义
// ============================================

interface VirtualListOptions {
  itemHeight: number | ((index: number) => number);
  overscan?: number;
  getItemKey?: (index: number, data: any) => string | number;
}

interface VirtualListResult<T> {
  visibleItems: {
    item: T;
    index: number;
    key: string | number;
    offset: number;
    height: number;
  }[];
  totalHeight: number;
  scrollTop: number;
  isScrolling: boolean;
  containerProps: {
    ref: React.RefObject<HTMLDivElement>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  innerProps: {
    style: React.CSSProperties;
  };
}

// ============================================
// Hook
// ============================================

export function useVirtualList<T>(
  items: T[] | undefined,
  options: VirtualListOptions
): VirtualListResult<T> {
  const {
    itemHeight,
    overscan = 3,
    getItemKey = (index, data) => index
  } = options;

  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [containerHeight, setContainerHeight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<number | undefined>(undefined);

  // 测量容器高度
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (!items) return 0;

    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }

    return items.reduce((sum, _, index) => sum + itemHeight(index), 0);
  }, [items, itemHeight]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    const getItemHeightAtIndex = typeof itemHeight === 'number'
      ? (_index: number) => itemHeight
      : itemHeight;

    let startIndex = 0;
    let offsetY = 0;

    // 找到第一个可见项目
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeightAtIndex(i);
      if (offsetY + height > scrollTop - overscan * getItemHeightAtIndex(Math.max(0, i - 1))) {
        startIndex = i;
        break;
      }
      offsetY += height;
    }

    // 计算可见项目
    const result: VirtualListResult<T>['visibleItems'] = [];
    let currentY = offsetY;

    for (let i = startIndex; i < items.length; i++) {
      const height = getItemHeightAtIndex(i);

      if (currentY > scrollTop + containerHeight + overscan * height) {
        break;
      }

      result.push({
        item: items[i],
        index: i,
        key: getItemKey(i, items[i]),
        offset: currentY,
        height
      });

      currentY += height;
    }

    return result;
  }, [items, itemHeight, scrollTop, containerHeight, overscan, getItemKey]);

  // 滚动处理
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // 容器属性
  const containerProps = {
    ref: containerRef as React.RefObject<HTMLDivElement>,
    onScroll: handleScroll,
    style: {
      height: '100%',
      overflow: 'auto',
      position: 'relative'
    } as React.CSSProperties
  };

  // 内部容器属性
  const innerProps = {
    style: {
      height: `${totalHeight}px`,
      position: 'relative' as const
    }
  };

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    isScrolling,
    containerProps,
    innerProps
  };
}

// ============================================
// 简化版虚拟列表（固定高度）
// ============================================

interface SimpleVirtualListResult<T> {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
  containerProps: {
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  innerProps: {
    style: React.CSSProperties;
  };
}

export function useSimpleVirtualList<T>(
  items: T[] | undefined,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
): SimpleVirtualListResult<T> {
  const [scrollTop, setScrollTop] = useState(0);

  const totalCount = items?.length || 0;
  const totalHeight = totalCount * itemHeight;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items?.slice(startIndex, endIndex) || [];
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const containerProps = {
    onScroll: handleScroll,
    style: {
      height: `${containerHeight}px`,
      overflow: 'auto'
    } as React.CSSProperties
  };

  const innerProps = {
    style: {
      height: `${totalHeight}px`,
      position: 'relative' as const
    }
  };

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    containerProps,
    innerProps
  };
}

// ============================================
// 使用示例
// ============================================

/**
 * // 高级虚拟列表（动态高度）
 * function DynamicVirtualList({ items }: { items: Item[] }) {
 *   const { visibleItems, containerProps, innerProps } = useVirtualList(items, {
 *     itemHeight: (index) => {
 *       // 根据内容动态计算高度
 *       return items[index].height || 100;
 *     },
 *     overscan: 5,
 *     getItemKey: (index, item) => item.id
 *   });
 *
 *   return (
 *     <div {...containerProps}>
 *       <div {...innerProps}>
 *         {visibleItems.map(({ item, index, key, offset, height }) => (
 *           <div
 *             key={key}
 *             style={{
 *               position: 'absolute',
 *               top: `${offset}px`,
 *               height: `${height}px`
 *             }}
 *           >
 *             <ItemRenderer item={item} index={index} />
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 *
 * // 简化虚拟列表（固定高度）
 * function SimpleVirtualList({ items }: { items: Item[] }) {
 *   const { visibleItems, offsetY, containerProps, innerProps } = useSimpleVirtualList(
 *     items,
 *     50, // 每项高度
 *     600, // 容器高度
 *     3 // 预渲染数量
 *   );
 *
 *   return (
 *     <div {...containerProps}>
 *       <div {...innerProps}>
 *         <div style={{ transform: `translateY(${offsetY}px)` }}>
 *           {visibleItems.map((item, index) => (
 *             <div
 *               key={item.id}
 *               style={{ height: '50px' }}
 *             >
 *               <ItemRenderer item={item} />
 *             </div>
 *           ))}
 *         </div>
 *       </div>
 *     </div>
 *   );
 * }
 */
