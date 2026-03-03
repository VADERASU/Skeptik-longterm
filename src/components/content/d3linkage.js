import { useEffect, useCallback, useState, useRef } from "react";
import * as d3 from 'd3';

export function Linkage ({paragraphNodes, fallacyNodes, offsetYfnode, linkage,
    fallacyChatList}){
    const canvasRef = useRef(null);
    const drawNodes = useCallback(()=>{
        const {scrollWidth, scrollHeight} = canvasRef.current;
        const offsetY = canvasRef.current.getBoundingClientRect().top; //60, 170
        //const offsetFnodeY = 22;
        //console.log('D3 Drawing - paragraphNodes:', paragraphNodes.length, 'fallacyNodes:', fallacyNodes.length, 'linkage:', linkage.length);
        let dimensions = {
            width: scrollWidth,
            height: scrollHeight,
            margin: {
                top: 0,
                right: 0,
                bottom: 0,//props.container === 'dependent' ? 11 : 0,
                left: 0, //60
            },
        };
        dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
        dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

        const svgRoot = d3.select(canvasRef.current).select("svg");
        const rootGroup = svgRoot.select('g#root-group');

        // Lines are now rendered via CSS in tag.js, so nothing to draw here


    },[fallacyNodes, paragraphNodes, offsetYfnode, fallacyChatList]);

    const clearCanvas = () => {
        const rootGroup = d3.select(canvasRef.current).select('g#root-group');
        rootGroup.selectAll('*').remove(); // Clear all children including circles
    };

    useEffect(()=>{
        clearCanvas();
        paragraphNodes.length !== 0 && drawNodes();
    },[fallacyNodes, paragraphNodes, offsetYfnode, fallacyChatList]);

    return(
        <div ref={canvasRef} style={{height: "100%", minHeight: "800px"}}>
            <svg
            style={{
                width: '100%',
                height: '100%',
                overflow: 'visible'
            }}
            >
                <g id="root-group"/>
            </svg>
        </div>
    );
}
