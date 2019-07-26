import { getConnection } from 'typeorm';
import { Company } from '../entity/Company';
import UserService from './UserService';
import CustomerService from './CustomerService';
import BaseService from './BaseService';
import CenterService from './CenterService';

interface CompanyItem {
    company: Company;
    services: BaseService[];
    userService: UserService;
    customerService: CustomerService;
}

const allCompanys = async () => {
    return await getConnection()
        .getRepository(Company)
        .createQueryBuilder('company')
        .getMany();
};

export const mapCompanys = new Map<number, CompanyItem>();

export const loadCompanyNamespace = async (io: SocketIO.Server) => {
    const rows = await allCompanys();

    rows.forEach((company) => {
        const userService = new UserService(company, io.of(`/${company.namespace}/service`) as any);
        const customerService = new CustomerService(company, io.of(`/${company.namespace}`) as any);
        const services: BaseService[] = [userService, customerService, new CenterService(userService, customerService)];
        mapCompanys.set(company.id, {
            company,
            services,
            userService,
            customerService,
        });
    });
};
