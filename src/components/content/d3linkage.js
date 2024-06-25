import { useEffect, useCallback, useState, useRef } from "react";
import * as d3 from 'd3';

export function Linkage ({paragraphNodes, fallacyNodes, offsetYfnode, linkage,
    fallacyChatList}){
    const canvasRef = useRef(null);
    const drawNodes = useCallback(()=>{
        const {scrollWidth, scrollHeight} = canvasRef.current;
        const offsetY = canvasRef.current.getBoundingClientRect().top; //60, 170
        //const offsetFnodeY = 22;
        //console.log('scrollY', offsetYfnode, 'scrollHeight', window.innerHeight);
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

        const p_nodes = rootGroup.append('g')
        .selectAll('paragraphNodes')
        .data(paragraphNodes)
        .join('circle')
        .attr('cx', (d)=>{
            //console.log(d);
            return d.x
        })
        .attr('cy', (d)=>d.y-30) //d.y-30
        .attr('r', (d)=>{
            let radius = 3;
            d.fallacy.forEach(f=>fallacyChatList[f].open && (radius = 8));
            return radius;
        }) //3
        .attr("class", "node")
        .attr("id", (d) => d.id)
        .attr('fill', (d)=>{
            let ncolor = '#fff';
            d.fallacy.forEach(f=>fallacyChatList[f].open && (ncolor = fallacyChatList[f].color));
            return ncolor;
        })
        .attr('stroke', 'grey');

        const f_nodes = rootGroup.append('g')
        .selectAll('fallacyNodes')
        .data(fallacyNodes)
        .join('circle')
        .attr('cx', (d)=>{
            //onsole.log(d);
            return d.x+8
        })
        .attr('cy', d=>d.y-offsetY + 83)
        .attr('r', 4)
        .attr("class", "node")
        .attr("id", (d) => d.id)
        .attr('fill', (d)=>fallacyChatList[d.fallacy].color)
        .attr('stroke', 'grey')
        .attr('opacity', (d)=>fallacyChatList[d.fallacy].open ? 1 : 0.4);

        const links = rootGroup.append('g')
        .selectAll('fallacyLinks')
        .data(linkage)
        .join("path")
        .attr("d", (d) =>{
            //console.log(d);
            const link = {
                source: [d.link.source[0]+5, d.link.source[1]+82-offsetY],
                target: [d.link.target[0]+3, d.link.target[1]-30]
            };

            return(d3.linkHorizontal()(link));
        })
        .attr("fill", "none")
        .attr('stroke', d=>fallacyChatList[d.fallacy].color)
        .attr('stroke-width', (d)=>{
            let swidth = 1;
            fallacyChatList[d.fallacy].open && (swidth = 3);
            return swidth;
        })
        .attr('stroke-opacity', (d)=>{
            /*let npos = d.link.target[1]-30; //60 - linkageContainer
            let offsetTop = npos+60 - offsetYfnode;
            let offsetBottom = npos+60 - window.innerHeight - offsetYfnode;
            //console.log('offsetTop', offsetTop);
            if(offsetTop>window.innerHeight || offsetTop<0){
                return .2;
            }else{
                return 1;
            }*/
            return fallacyChatList[d.fallacy].open ? 1 : 0.3;
        });


    },[fallacyNodes, paragraphNodes, offsetYfnode, fallacyChatList]);

    const clearCanvas = () => {
        const rootGroup = d3.select(canvasRef.current).select('g#root-group');
        rootGroup.selectAll('g').remove();
    };

    useEffect(()=>{
        clearCanvas();
        paragraphNodes.length !== 0 && drawNodes();
    },[fallacyNodes, paragraphNodes, offsetYfnode, fallacyChatList]);
    
    return(
        <div ref={canvasRef} style={{height: "100%"}}>
            <svg
            style={{
                width: '100%',
                height: '100%'
            }}
            >
                <g id="root-group"/>
            </svg>
        </div>
    );
}