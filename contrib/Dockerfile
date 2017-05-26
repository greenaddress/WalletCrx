FROM debian:jessie

COPY jessie_deps.sh /deps.sh
RUN /deps.sh && rm /deps.sh
VOLUME /walletcrx
CMD cd /walletcrx && ./makePackages.sh -b master
