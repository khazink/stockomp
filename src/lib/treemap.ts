export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TreemapItem<T = any> {
    id: string;
    value: number;
    data: T;
}

export interface PlacedNode<T = any> {
    item: TreemapItem<T>;
    rect: Rect;
}

export function squarifyLayout<T = any>(
    items: TreemapItem<T>[],
    bounds: Rect
): PlacedNode<T>[] {
    const { x, y, width, height } = bounds;
    if (!items || items.length === 0 || width <= 0 || height <= 0) return [];

    const totalValue = items.reduce((sum, item) => sum + Math.max(0.0001, item.value), 0);
    const totalArea = width * height;

    interface NormalizedItem extends TreemapItem<T> {
        area: number;
    }

    const normalized: NormalizedItem[] = items.map(item => ({
        ...item,
        area: (Math.max(0.0001, item.value) / totalValue) * totalArea,
    })).sort((a, b) => b.area - a.area);

    const result: PlacedNode<T>[] = [];

    function layoutRow(
        row: NormalizedItem[],
        sideLength: number,
        currentX: number,
        currentY: number,
        isHorizontal: boolean
    ): number {
        const rowArea = row.reduce((s, r) => s + r.area, 0);
        const rowThickness = rowArea / sideLength;

        let offset = 0;
        for (const r of row) {
            const itemLength = r.area / rowThickness;
            if (isHorizontal) {
                result.push({
                    item: r,
                    rect: {
                        x: currentX + offset,
                        y: currentY,
                        width: itemLength,
                        height: rowThickness,
                    }
                });
            } else {
                result.push({
                    item: r,
                    rect: {
                        x: currentX,
                        y: currentY + offset,
                        width: rowThickness,
                        height: itemLength,
                    }
                });
            }
            offset += itemLength;
        }

        return rowThickness;
    }

    function worstAspectRatio(row: NormalizedItem[], sideLength: number): number {
        if (!row.length) return Infinity;
        const rowArea = row.reduce((s, r) => s + r.area, 0);
        const rowThickness = rowArea / sideLength;
        let worst = 1;
        for (const r of row) {
            const itemLength = r.area / rowThickness;
            const aspect = Math.max(rowThickness / itemLength, itemLength / rowThickness);
            if (aspect > worst) worst = aspect;
        }
        return worst;
    }

    let remaining = [...normalized];
    let curX = x, curY = y, curW = width, curH = height;

    while (remaining.length > 0) {
        const isHorizontal = curW >= curH;
        const sideLength = isHorizontal ? curH : curW;

        let row: NormalizedItem[] = [remaining[0]];
        let currentWorst = worstAspectRatio(row, sideLength);
        let i = 1;

        while (i < remaining.length) {
            const candidateRow = [...row, remaining[i]];
            const candidateWorst = worstAspectRatio(candidateRow, sideLength);
            if (candidateWorst <= currentWorst) {
                row = candidateRow;
                currentWorst = candidateWorst;
                i++;
            } else {
                break;
            }
        }

        const thickness = layoutRow(row, sideLength, curX, curY, !isHorizontal);

        if (isHorizontal) {
            curX += thickness;
            curW = Math.max(0, curW - thickness);
        } else {
            curY += thickness;
            curH = Math.max(0, curH - thickness);
        }

        remaining = remaining.slice(row.length);
        if (curW <= 0 || curH <= 0) break;
    }

    return result;
}
